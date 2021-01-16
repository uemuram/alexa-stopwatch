// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const CommonUtil = require('./CommonUtil.js');
const util = new CommonUtil();

// ステータス
const TIMER_RUNNING = 0;     // タイマー実行中
const TIMER_STOPPING = 1;    // タイマー停止中
const CONFIRM_PURCHASE = 2;  // 購入確認中
const UNDER_PURCHASE = 3;    // 購入処理中
const CONFIRM_RUN_TIMER = 4; // タイマー実行確認中
const SKILL_END = 5;         // スキル終了


// オーディオ関連データ
// TODO CloudFrontはやめる。月5万くらい行きそう
// TODO URLを環境変数からとるようにしたい(cloudfrontやめるときとか、開発用とか)
// TODO オーディオサイズ削減。モノラルにしてビットレートも落とすとだいぶ下がるのでは
const timerSoundUrl = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_60m.mp3';
const audioMetaData = {
    "title": "計測",
    "subtitle": "「アレクサ、ストップ」で停止",
    "art": {
        "sources": [
            {
                "url": "https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/audio_art.png"
            }
        ]
    },
    "backgroundImage": {
        "sources": [
            {
                "url": "https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/audio_backgroundImage.png"
            }
        ]
    }
}

// 拡張パック利用可能かどうかを判断する
async function isEnitledExpansionPack(handlerInput) {
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    // 製品情報を取得
    const locale = handlerInput.requestEnvelope.request.locale;
    const products = await ms.getInSkillProducts(locale);
    // ステータスをチェック
    const entitled = products.inSkillProducts[0].entitled;
    console.log(`entitled : ${entitled}`);
    if (entitled == 'ENTITLED') {
        return true;
    } else {
        return false;
    }
}

// 計測開始レスポンスを返す
async function getStartTimerResponse(handlerInput) {
    const entitled = await isEnitledExpansionPack(handlerInput);
    if (entitled) {
        return handlerInput.responseBuilder
            .speak('5時間の計測を開始します。')
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, 'token', 0, null, audioMetaData)
            .getResponse();
    } else {
        return handlerInput.responseBuilder
            .speak('1時間の計測を開始します。')
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, 'token', 0, null, audioMetaData)
            .getResponse();
    }
}

// ミリ秒を読み上げ可能な時間形式にする
function getTimerStr(time) {
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

// スキル起動 & 計測開始
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        util.setState(handlerInput, TIMER_RUNNING);
        return await getStartTimerResponse(handlerInput);
    }
};

// 計測開始
const TimerStartIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (util.checkStrictSlotMatch(handlerInput, 'TimerStartIntent', 'TimerStartOrder')
                || (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' && util.checkState(handlerInput, CONFIRM_RUN_TIMER))
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent');
    },
    async handle(handlerInput) {
        util.setState(handlerInput, TIMER_RUNNING);
        return await getStartTimerResponse(handlerInput);
    }
};

// タイマー停止
const TimerStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent');
    },
    async handle(handlerInput) {
        let audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;

        // 拡張パック購入状況をチェック
        const entitled = await isEnitledExpansionPack(handlerInput);

        // ミリ秒を結果に変換
        let time = audioPlayer.offsetInMilliseconds - 4000; // 最初のカウント分を減らす
        const totalMsec = time;
        // タイマー音声内でまだ開始していなかったらキャンセル。
        if (time < 0) {
            return handlerInput.responseBuilder
                .addAudioPlayerStopDirective()
                .speak('停止します。')
                .getResponse();
        }
        const timerStr = getTimerStr(time);
        const speechStr = `
            <speak>
                ${timerStr.hhmmss}<say-as interpret-as="digits">${timerStr.ms}</say-as>です。
            </speak>
        `;
        console.log(`タイマー停止 : ${totalMsec}(${timerStr.all})`);

        // カード情報を整備
        const cardTitle = timerStr.all;
        let cardBody = ""
            + "TIPS\n"
            + "・計測を再開　：「アレクサ、再開」\n"
            + "・最初から計測：「アレクサ、最初から」";
        // 未購入のときのみ拡張パックの案内を付与
        if (!entitled) {
            cardBody += '\n・時間を延ばす：「アレクサ、シンプルストップウォッチで拡張パック」';
        }

        let response = handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechStr)
            .withSimpleCard(cardTitle, cardBody);

        // 画面利用可能であれば画面を追加
        if (handlerInput.requestEnvelope.context.Viewport) {
            let aplDocument = util.deepCopy(require('./apl/TemplateDocument.json'));
            let aplDataSource = require('./apl/TemplateDataSource.json');
            aplDataSource.data.timerStr = timerStr.all;
            // 購入済みなら拡張パックの案内を外す
            if (entitled) {
                aplDocument.mainTemplate.items[0].items.pop();
                aplDocument.mainTemplate.items[1].items.pop();
            }
            response = response.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.4',
                document: aplDocument,
                datasources: aplDataSource
            })
        }

        util.setState(handlerInput, TIMER_STOPPING);
        return response.getResponse();
    }
};

// タイマー再開
const TimerRestartIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent');
    },
    handle(handlerInput) {
        let audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
        const token = audioPlayer.token;
        const offset = audioPlayer.offsetInMilliseconds;

        util.setState(handlerInput, TIMER_RUNNING);
        return handlerInput.responseBuilder
            .speak('計測を再開します。')
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, token, offset, null, audioMetaData)
            .getResponse();
    }
};

// 何を購入できるかの説明
// TODO 最初1時間、という要素をどこかに入れるべきか・・・
const WhatCanIBuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            util.checkStrictSlotMatch(handlerInput, 'WhatCanIBuyIntent', 'WhatCanIBuyOrder');
    },
    async handle(handlerInput) {
        console.log('商品説明');

        // 拡張パック購入状況をチェック
        const entitled = await isEnitledExpansionPack(handlerInput);

        // 購入済み
        if (entitled) {
            util.setState(handlerInput, CONFIRM_RUN_TIMER);
            return handlerInput.responseBuilder
                .speak(`
                    ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入すると最大5時間に拡張できます。
                    拡張パックはすでにお持ちです。
                    続いて計測を行いますか?
                `)
                .reprompt('計測を行いますか?')
                .getResponse();
        };

        util.setState(handlerInput, CONFIRM_PURCHASE);
        return handlerInput.responseBuilder
            .speak(`
                ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入すると最大5時間に拡張できます。
                購入処理に進みますか?
            `)
            .reprompt('購入処理に進みますか?')
            .getResponse();
    },
};

// ユーザから何もしない意思を示されたとき(購入しない、計測再開しないなど)
const DoNothingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (util.checkStrictSlotMatch(handlerInput, 'DontBuyIntent', 'DontBuyOrder')
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        console.log('何もしない');

        util.setState(handlerInput, SKILL_END);
        return handlerInput.responseBuilder
            .speak('またご利用ください。')
            .addAudioPlayerStopDirective()
            .getResponse();
    },
};

// 購入処理
const BuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (util.checkStrictSlotMatch(handlerInput, 'BuyIntent', 'BuyOrder')
                || (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' && util.checkState(handlerInput, CONFIRM_PURCHASE))
            );
    },
    async handle(handlerInput) {
        console.log('購入処理');

        const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

        // 製品情報を取得
        const locale = handlerInput.requestEnvelope.request.locale;
        const products = await ms.getInSkillProducts(locale);
        console.log(products);

        // ステータスをチェック
        product = products.inSkillProducts[0];
        const productId = product.productId;
        const entitled = product.entitled;
        console.log(`productId : ${productId}`);
        console.log(`entitled : ${entitled}`);

        // Alexa標準の購入処理に進む
        util.setState(handlerInput, UNDER_PURCHASE);
        return handlerInput.responseBuilder
            .addDirective({
                type: 'Connections.SendRequest',
                name: 'Buy',
                payload: {
                    InSkillProduct: {
                        productId: productId,
                    },
                },
                token: 'correlationToken',
            })
            .getResponse();
    },
};


// TODO 音声を作成
// TODO docsから不要なドキュメントを除去(承認された後)
// TODO 外だしするなら環境変数ではなくパラメータストアかな


// 購入処理からの復帰
const BuyResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response' &&
            (handlerInput.requestEnvelope.request.name === 'Buy' ||
                handlerInput.requestEnvelope.request.name === 'Upsell');
    },
    async handle(handlerInput) {
        console.log('購入処理から復帰');

        util.setState(handlerInput, CONFIRM_RUN_TIMER);
        return handlerInput.responseBuilder
            .speak(`続いて計測を行いますか?`)
            .reprompt('計測を行いますか?')
            .getResponse();
    },
};

// そのほかのオーディオ関連発話を拾うハンドラ(特に何もしない)
const DoNothingIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOffIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.LoopOnIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOffIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ShuffleOnIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent'
            );
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

// オーディオの状態(開始した、終了した、など)によって発生するイベントのハンドラ(特に何もしない)
const DoNothingAudioPlayerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackStarted'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackFinished'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackStopped'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackNearlyFinished'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackFailed'
            ;
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

// 画面操作によって発生するイベントのハンドラ(特に何もしない)
const DoNothingPlaybackControllerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PreviousCommandIssued'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.NextCommandIssued'
            || Alexa.getRequestType(handlerInput.requestEnvelope) === 'System.ExceptionEncountered'
            ;
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

// 画面操作によって発生するイベントのハンドラ(停止)
const TimerStopPlaybackControllerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PauseCommandIssued';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .getResponse();
    }
};

// 画面操作によって発生するイベントのハンドラ(再開)
const TimerRestartPlaybackControllerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'PlaybackController.PlayCommandIssued';
    },
    handle(handlerInput) {
        let audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
        const token = audioPlayer.token;
        const offset = audioPlayer.offsetInMilliseconds;

        return handlerInput.responseBuilder
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, token, offset, null, audioMetaData)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// ヘルプ
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    async handle(handlerInput) {
        let speakOutput = ''
            + 'シンプルなストップウォッチスキルです。'
            + 'スキルを起動するとすぐにストップウォッチがスタートし、カウント音が流れている間、時間計測を行います。'
            + 'ストップウォッチを止めるにはカウント音が流れているときに「アレクサ、ストップ」と言ってください。'
            + 'ストップ後に計測を再開するには、「アレクサ、再開」と言ってください。'
            + 'ストップ後に新たに計測を始める場合は、「アレクサ、最初から」と言ってください。'
            + 'また、計測時間は最大1時間ですが、拡張パックを購入すると最大5時間に拡張できます。'
            + '拡張する場合は、「アレクサ、シンプルストップウォッチで拡張パック」、のように言ってください。'
            + '計測を行いますか?'
            ;

        util.setState(handlerInput, CONFIRM_RUN_TIMER);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('計測を行いますか?')
            .getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `想定外の呼び出しが発生しました。もう一度お試しください。`;
        console.log(intentName);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `エラーが発生しました。もう一度お試しください。`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt(speakOutput)
            .getResponse();
    }
};


// リクエストインターセプター(エラー調査用)
const RequestLog = {
    process(handlerInput) {
        //console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
        console.log("HANDLER INPUT = " + JSON.stringify(handlerInput));
        console.log("REQUEST TYPE =  " + Alexa.getRequestType(handlerInput.requestEnvelope));
        return;
    }
};


// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        TimerStartIntentHandler,
        TimerStopIntentHandler,
        TimerRestartIntentHandler,
        WhatCanIBuyIntentHandler,
        DoNothingHandler,
        BuyIntentHandler,
        BuyResponseHandler,
        DoNothingIntentHandler,
        DoNothingAudioPlayerHandler,
        DoNothingPlaybackControllerHandler,
        TimerStopPlaybackControllerHandler,
        TimerRestartPlaybackControllerHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .addRequestInterceptors(RequestLog)
    .lambda();
