const AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');

const CommonUtil = require('./CommonUtil.js');
const util = new CommonUtil();

const Constant = require('./Constant');
const c = new Constant();

class Logic {

    // スキル内商品の情報を取得する
    async getProductInfo(handlerInput) {
        const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        // 製品情報を取得
        const locale = handlerInput.requestEnvelope.request.locale;
        const products = await ms.getInSkillProducts(locale);

        // ステータスをチェック
        const product = products.inSkillProducts[0];
        const productId = product.productId;
        const entitled = product.entitled;
        console.log(`productId : ${productId}`);
        console.log(`entitled : ${entitled}`);

        return {
            productId: productId,
            entitled: entitled
        };
    }

    // 拡張パック利用可能かどうかを判断する
    async isEnitledExpansionPack(handlerInput) {
        const productInfo = await this.getProductInfo(handlerInput);
        if (productInfo.entitled == 'ENTITLED') {
            return true;
        } else {
            return false;
        }
    }

    // 最初から計測する際のレスポンスを返す
    getStartTimerResponse(handlerInput, message) {
        let response = handlerInput.responseBuilder;
        if (message) {
            response = response.speak(message);
        }
        const url = `${this.getTimerSoundUrlPrefix(handlerInput)}0.mp3`;
        const token = this.generateToken(0);

        console.log(`計測開始 : ${token}`);
        return response
            .addAudioPlayerPlayDirective('REPLACE_ALL', url, token, 0, null, this.getAudioMetaData(handlerInput))
            .getResponse();
    }

    // 再開する際のレスポンスを返す
    getRestartTimerResponse(handlerInput, message) {
        let response = handlerInput.responseBuilder;
        const audioInfo = this.getAudioInfo(handlerInput);

        // 終了メッセージ再生中は再開しない
        if (audioInfo.token == c.timerFinishToken) {
            return response
                .addAudioPlayerStopDirective()
                .getResponse();
        }
        const url = `${this.getTimerSoundUrlPrefix(handlerInput)}${audioInfo.idx}.mp3`;
        console.log(`計測再開 : ${audioInfo.token}(${audioInfo.offsetInMilliseconds}～)`);

        if (message) {
            response = response.speak(message);
        }
        return response
            .addAudioPlayerPlayDirective('REPLACE_ALL', url, audioInfo.token, audioInfo.offsetInMilliseconds, null, this.getAudioMetaData(handlerInput))
            .getResponse();
    }

    // ミリ秒を読み上げ可能な時間形式にする
    getTimerStr(time, handlerInput) {
        time = Math.round(time / 10) * 10;
        let h = Math.floor(time / 3600000);
        time %= 3600000
        let m = Math.floor(time / 60000);
        time %= 60000;
        let s = Math.floor(time / 1000);
        time %= 1000;
        let ms = ('000' + time).slice(-4).substring(1, 3);

        // 言語を取得
        const lang = util.getLang(handlerInput);

        let read, write;
        switch (lang) {
            case 'ja':
                if (h > 0) {
                    let hhmmss = `${h}時間${m}分${s}秒`;
                } else if (m > 0) {
                    let hhmmss = `${m}分${s}秒`;
                } else {
                    let hhmmss = `${s}秒`;
                }
                const hhmmss_read = hhmmss.replace('間0分', '間0ふん');
                read = `
                    <speak>
                        ${hhmmss_read}<say-as interpret-as="digits">${ms}</say-as>です。
                    </speak>
                `;
                write = hhmmss + ms;
                break;
            case 'en':
                const hour = h == 1 ? "hour" : "hours";
                const minute = m == 1 ? "minute" : "minutes";

                if (h > 0) {
                    read = `<speak>
                                ${h}${hour}${m}${minute}${s}point<say-as interpret-as="digits">${ms}</say-as>seconds
                            </speak>`;
                } else if (m > 0) {
                    read = `<speak>
                                ${m}${minute}${s}point<say-as interpret-as="digits">${ms}</say-as>seconds
                            </speak>`;
                } else {
                    read = `<speak>
                                ${s}point<say-as interpret-as="digits">${ms}</say-as>seconds
                            </speak>`;
                }
                write = `${('00' + h).slice(-2)}:${('00' + m).slice(-2)}:${('00' + s).slice(-2)}.${ms}`;
                break;
            default:
                break;
        }
        return {
            read: read,
            write: write,
        }
    }

    // mp3のURLを取得(プレフィックス)
    getTimerSoundUrlPrefix(handlerInput) {
        const lang = util.getLang(handlerInput);
        const urlPrefix = `${c.resourcesParentUrl}/${lang}/timer_`;
        console.log(`urlPrefix : ${urlPrefix}`);
        return urlPrefix;
    }

    // mp3のURLを取得(終了)
    getTimerFinishUrl(handlerInput) {
        const lang = util.getLang(handlerInput);
        const finishUrl = `${c.resourcesParentUrl}/${lang}/timer_finish.mp3`;
        console.log(`finishUrl : ${finishUrl}`);
        return finishUrl;
    }

    // audio関連の情報を返す
    getAudioInfo(handlerInput) {
        const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
        const token = audioPlayer.token;
        console.log(`トークン : ${token}`);

        const match = token.match(new RegExp(`^${c.tokenPrefix}(.*)_.*$`));
        const idx = match ? Number(match[1]) : null;
        console.log(`index : ${idx}`);

        return {
            token: token,
            offsetInMilliseconds: audioPlayer.offsetInMilliseconds,
            idx: idx
        }
    }

    // トークンを発行する
    // token_1_【文字列(ミリ秒)】
    generateToken(idx) {
        return `${c.tokenPrefix}${idx}_${new Date().getTime().toString()}`;
    }

    // オーディオのメタデータを取得
    getAudioMetaData(handlerInput) {
        let audioMeataData = c.audioMetaData;
        audioMeataData.title = util.getConstantByLang(handlerInput, "AUDIO_TITLE");
        audioMeataData.subtitle = util.getConstantByLang(handlerInput, "AUDIO_SUBTITLE");
        return audioMeataData;
    }

}

module.exports = Logic;