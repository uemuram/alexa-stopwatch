const AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');

const CommonUtil = require('./CommonUtil.js');
const util = new CommonUtil();

const Constant = require('./Constant');
const c = new Constant();

const timerSoundUrl_60m = 'https://uemuram.github.io/alexa-stopwatch/timer_60m.mp3';
//const timerSoundUrl_240m = 'https://uemuram.github.io/alexa-stopwatch/timer_240m.mp3';
const timerSoundUrl_240m = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_240m.mp3';


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

    // 計測開始レスポンスを返す
    async getStartTimerResponse(handlerInput, offset, message) {
        const entitled = await this.isEnitledExpansionPack(handlerInput);

        let response = handlerInput.responseBuilder;
        if (message) {
            response = response.speak(message);
        }

        if (entitled) {
            console.log(`計測開始 : 240m (${offset}～)`);
            return response
                .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl_240m, 'token', offset, null, c.audioMetaData)
                .getResponse();
        } else {
            console.log(`計測開始 : 60m (${offset}～)`);
            return response
                .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl_60m, 'token', offset, null, c.audioMetaData)
                .getResponse();
        }
    }

    // 最初から計測する際のレスポンスを返す
    async getStartTimerResponse2(handlerInput, message) {
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

    // 計測を再開する際のレスポンスを返す



    // // ログタイプ要求メッセージ
    // requestLogType(handlerInput) {
    //     console.log('ログタイプ要求');
    //     util.setSessionValue(handlerInput, 'LOG_TYPE', null);
    //     const speakOutput = '体重、体脂肪率、水分量を記録できます。何を記録しますか?';
    //     return handlerInput.responseBuilder
    //         .speak(speakOutput)
    //         .reprompt(speakOutput)
    //         .getResponse();
    // }

    // // 体重を記録
    // async recodeWeight(handlerInput, token) {
    //     // スロット値を取得
    //     const integerSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Integer');
    //     console.log('スロット値(Integer) : ' + integerSlotValue);
    //     const decimalSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Decimal');
    //     console.log('スロット値(Decimal) : ' + decimalSlotValue);

    //     // 値を整理
    //     let logValue = util.adjustDecimalValue(integerSlotValue, decimalSlotValue);
    //     // 小数第2位で四捨五入
    //     logValue = (Math.round(logValue * 10)) / 10;
    //     // TODO logValueの値チェック。undefだったりした場合の処理
    //     // TODO 上限値の設定が必要

    //     // 本日日付け(日本時間にするために+9時間する)
    //     let today = new Date();
    //     today.setHours(today.getHours() + 9);

    //     // リクエストURL組み立て
    //     const url = `https://api.fitbit.com/1/user/-/body/log/weight.json?weight=${logValue}&date=${util.formatDate(today)}`;
    //     console.log(`url : ${url}`);

    //     // リクエスト実行
    //     let response;
    //     try {
    //         response = await Axios.post(url, null, { headers: { Authorization: `Bearer ${token}` } });
    //     } catch (error) {
    //         console.log(JSON.stringify(error.response.data));
    //     }
    //     console.log(response.data);

    //     const speakOutput = `体重を${logValue}キロで記録しました。`;
    //     return handlerInput.responseBuilder
    //         .speak(speakOutput)
    //         .withSimpleCard('タイトル', integerSlotValue + "/" + decimalSlotValue)
    //         .reprompt(speakOutput)
    //         .getResponse();
    // }

    // // 体脂肪率を記録
    // async recodeFat(handlerInput, token) {
    //     // スロット値を取得
    //     const integerSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Integer');
    //     console.log('スロット値(Integer) : ' + integerSlotValue);
    //     const decimalSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Decimal');
    //     console.log('スロット値(Decimal) : ' + decimalSlotValue);

    //     // 値を整理
    //     let logValue = util.adjustDecimalValue(integerSlotValue, decimalSlotValue);
    //     // 小数第2位で四捨五入
    //     logValue = (Math.round(logValue * 10)) / 10;
    //     // TODO logValueの値チェック。undefだったりした場合の処理
    //     // TODO 上限値の設定が必要

    //     // 本日日付け(日本時間にするために+9時間する)
    //     let today = new Date();
    //     today.setHours(today.getHours() + 9);

    //     // リクエストURL組み立て
    //     const url = `https://api.fitbit.com/1/user/-/body/log/fat.json?fat=${logValue}&date=${util.formatDate(today)}`;
    //     console.log(`url : ${url}`);

    //     // リクエスト実行
    //     let response;
    //     try {
    //         response = await Axios.post(url, null, { headers: { Authorization: `Bearer ${token}` } });
    //     } catch (error) {
    //         console.log(JSON.stringify(error.response.data));
    //     }
    //     console.log(response.data);

    //     const speakOutput = `体脂肪率を${logValue}パーセントで記録しました。`;
    //     return handlerInput.responseBuilder
    //         .speak(speakOutput)
    //         .withSimpleCard('タイトル', integerSlotValue + "/" + decimalSlotValue)
    //         .reprompt(speakOutput)
    //         .getResponse();
    // }

    // // 水分摂取量を記録
    // async recodeWater(handlerInput, token) {
    //     // スロット値を取得
    //     const integerSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Integer');
    //     console.log('スロット値(Integer) : ' + integerSlotValue);
    //     const decimalSlotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, 'Decimal');
    //     console.log('スロット値(Decimal) : ' + decimalSlotValue);

    //     // 値を整理
    //     let logValue = util.adjustDecimalValue(integerSlotValue, decimalSlotValue);
    //     // 小数第2位で四捨五入
    //     logValue = (Math.round(logValue * 10)) / 10;
    //     // TODO logValueの値チェック。undefだったりした場合の処理
    //     // TODO 上限値の設定が必要

    //     // 本日日付け(日本時間にするために+9時間する)
    //     let today = new Date();
    //     today.setHours(today.getHours() + 9);

    //     // リクエストURL組み立て
    //     const url = `https://api.fitbit.com/1/user/-/foods/log/water.json?amount=${logValue}&date=${util.formatDate(today)}&unit=cup`;
    //     console.log(`url : ${url}`);

    //     // リクエスト実行
    //     let response;
    //     try {
    //         response = await Axios.post(url, null, { headers: { Authorization: `Bearer ${token}` } });
    //     } catch (error) {
    //         console.log(JSON.stringify(error.response.data));
    //     }
    //     console.log(response.data);

    //     const speakOutput = `${logValue}カップの水分摂取量を記録しました。`;
    //     return handlerInput.responseBuilder
    //         .speak(speakOutput)
    //         .withSimpleCard('タイトル', integerSlotValue + "/" + decimalSlotValue)
    //         .reprompt(speakOutput)
    //         .getResponse();
    // }


}

module.exports = Logic;