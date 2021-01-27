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
        const url = `${c.timerSoundUrlPrefix}0.mp3`;
        const token = `${c.tokenPrefix}0`;
        console.log(`計測開始 : ${token}`);
        return response
            .addAudioPlayerPlayDirective('REPLACE_ALL', url, token, 0, null, c.audioMetaData)
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
        const url = `${c.timerSoundUrlPrefix}${audioInfo.idx}.mp3`;
        console.log(`計測再開 : ${audioInfo.token}(${audioInfo.offsetInMilliseconds}～)`);

        if (message) {
            response = response.speak(message);
        }
        return response
            .addAudioPlayerPlayDirective('REPLACE_ALL', url, audioInfo.token, audioInfo.offsetInMilliseconds, null, c.audioMetaData)
            .getResponse();
    }

    // ミリ秒を読み上げ可能な時間形式にする
    getTimerStr(time) {
        time = Math.round(time / 10) * 10;
        let h = Math.floor(time / 3600000);
        time %= 3600000
        let m = Math.floor(time / 60000);
        time %= 60000;
        let s = Math.floor(time / 1000);
        time %= 1000;
        let ms = ('000' + time).slice(-4).substring(1, 3);
        let hhmmss = '';
        if (h > 0) {
            hhmmss = h + "時間" + m + "分" + s + "秒";
        } else if (m > 0) {
            hhmmss = m + "分" + s + "秒";
        } else {
            hhmmss = s + "秒";
        }
        return {
            all: hhmmss + ms,
            hhmmss: hhmmss,
            ms: ms
        }
    }

    // audio関連の情報を返す
    getAudioInfo(handlerInput) {
        const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
        const token = audioPlayer.token;
        console.log(`トークン : ${token}`);
        return {
            token: token,
            offsetInMilliseconds: audioPlayer.offsetInMilliseconds,
            idx: Number(token.substring(c.tokenPrefix.length))
        }
    }




}

module.exports = Logic;