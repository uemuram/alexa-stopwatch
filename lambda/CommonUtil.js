const AWS = require('aws-sdk');
const Alexa = require('ask-sdk-core');

class CommonUtil {

    // 状態をチェック
    checkState(handlerInput, state) {
        return (this.getState(handlerInput) == state);
    }

    //状態を取得
    getState(handlerInput) {
        return this.getSessionValue(handlerInput, 'STATE');
    }

    //状態を保存
    setState(handlerInput, state) {
        this.setSessionValue(handlerInput, 'STATE', state);
    }

    // セッションから値を取得
    getSessionValue(handlerInput, key) {
        const attr = handlerInput.attributesManager.getSessionAttributes();
        return attr[key];
    }

    // セッションに値を入れる
    setSessionValue(handlerInput, key, value) {
        let attr = handlerInput.attributesManager.getSessionAttributes();
        attr[key] = value;
        handlerInput.attributesManager.setSessionAttributes(attr);
        console.log("セッション保存 : " + JSON.stringify({ 'key': key, 'value': value }));
    }

    // 永続領域から値を取得
    async getPersistentValue(handlerInput, key) {
        const attr = handlerInput.attributesManager;
        const persistentAttributes = await attr.getPersistentAttributes();
        return persistentAttributes[key];
    }

    // 永続領域に値を入れる
    async setPersistentValue(handlerInput, key, value) {
        const attr = handlerInput.attributesManager;
        const persistentAttributes = await attr.getPersistentAttributes();
        persistentAttributes[key] = value;
        attr.setPersistentAttributes(persistentAttributes);
        await attr.savePersistentAttributes();
        console.log("永続データ保存 : " + JSON.stringify({ 'key': key, 'value': value }));
    }

    // セッションからスロット情報を取得
    getSlotInfo(handlerInput, slotName) {
        let slotInfo = {
            value: null,
            id: null,
            statusCode: null
        };

        // スロット値を設定
        const slotValue = Alexa.getSlotValue(handlerInput.requestEnvelope, slotName);
        slotInfo.value = slotValue;

        if (slotValue) {
            // ステータスを設定
            const resolutionsPerAuthority = handlerInput.requestEnvelope.request.intent.slots[slotName].resolutions.resolutionsPerAuthority[0];
            const statusCode = resolutionsPerAuthority.status.code;
            slotInfo.statusCode = statusCode;

            // IDを設定
            if (statusCode == 'ER_SUCCESS_MATCH') {
                const slotId = resolutionsPerAuthority.values[0].value.id;
                slotInfo.id = slotId;
            }
        }
        console.log(`スロット値取得(${slotName}) : ${JSON.stringify(slotInfo)}`);
        return slotInfo;
    }

    // スロットにインテント名 & スロット名に厳密にマッチしたかを判定する
    checkStrictSlotMatch(handlerInput, intentName, slotName) {
        // インテント名のチェック
        if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest' ||
            Alexa.getIntentName(handlerInput.requestEnvelope) !== intentName) {
            return false;
        }
        // スロットの取得ステータスをチェック
        const slotInfo = this.getSlotInfo(handlerInput, slotName);
        if (slotInfo.statusCode && slotInfo.statusCode == 'ER_SUCCESS_MATCH') {
            return true;
        } else {
            return false;
        }
    }

    // 状態とインテントにマッチしたかを判定する
    checkIntentAndStateMatch(handlerInput, intentName, state) {
        // インテント名のチェック
        if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest' ||
            Alexa.getIntentName(handlerInput.requestEnvelope) !== intentName) {
            return false;
        }
        // 状態チェック
        return this.checkState(handlerInput, state);
    }

    // パラメータストアから値を取得(再利用のために取得後にセッションに格納)
    // 非同期処理を含むので、呼び出し元ではawaitを付けて呼び出すこと
    async getParameterFromSSM(handlerInput, key) {
        // セッションにあればそこから取得、なければパラメータストアから取得
        let parameter = this.getSessionValue(handlerInput, key);
        if (parameter) {
            console.log(key + ' : ' + parameter + '(セッションから取得)');
        } else {
            const ssm = new AWS.SSM();
            const request = { Name: key, WithDecryption: true };
            const response = await ssm.getParameter(request).promise();
            parameter = response.Parameter.Value;
            console.log(key + ' : ' + parameter + '(SSMから取得)');
            // セッションに保管
            this.setSessionValue(handlerInput, key, parameter);
        }
        return parameter;
    }

    // オブジェクトのディープコピー
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // 同じ日付けかどうか判定する
    isSameDate(date1, date2) {
        if (
            (date1.getFullYear() == date2.getFullYear())
            && (date1.getMonth() == date2.getMonth())
            && (date1.getDate() == date2.getDate())
        ) {
            return true;
        } else {
            return false;
        }
    }

    // 日付けをYYYY-MM-DD形式にフォーマットする
    formatDate(date) {
        return date.getFullYear()
            + '-' + ('0' + (date.getMonth() + 1)).slice(-2)
            + '-' + ('0' + date.getDate()).slice(-2);
    }

    // 乱数を返す
    // random(3)であれば、0,1,2のどれかを返す
    random(n) {
        return Math.floor(Math.random() * n);
    }

    // プログレッシブ応答(重い処理が完了する前に先行して返す応答)を呼ぶ
    // 使い方 : await util.callDirectiveService(handlerInput, '応答メッセージ');
    // exports.handler に .withApiClient(new Alexa.DefaultApiClient())を追加する必要あり
    callDirectiveService(handlerInput, message) {
        console.log(`プログレッシブ応答 : ${message}`);
        const requestEnvelope = handlerInput.requestEnvelope;
        const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();
        const requestId = requestEnvelope.request.requestId;
        // build the progressive response directive
        const directive = {
            header: {
                requestId,
            },
            directive: {
                type: 'VoicePlayer.Speak',
                speech: `${message}`,
            },
        };
        // send directive
        return directiveServiceClient.enqueue(directive);
    }

    // APL利用可能か判定する
    isAvailableAPL(handlerInput) {
        return Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL'];
    }

    // 指定した秒数(ミリ秒)待つ
    // await util.sleep(3000); で3秒待つ
    sleep(miliSec) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve()
            }, miliSec)
        })
    }

}

module.exports = CommonUtil;