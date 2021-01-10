// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const timerSoundUrl = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_1h.mp3';
const audioMetaData = {
    "title": "計測中",
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

// スキル起動 & 計測開始
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('計測を開始します。')
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, 'token', 0, null, audioMetaData)
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = ''
            + 'シンプルなストップウォッチスキルです。最大1時間の計測ができます。'
            + 'スキルを起動するとすぐにストップウォッチがスタートし、カウント音が流れている間、時間計測を行います。'
            + 'ストップウォッチを止めるにはカウント音が流れているときに「アレクサ、ストップ」と言ってください。'
            + 'ストップ後に計測を再開するには、「アレクサ、再開」と言ってください。'
            + '新たに計測を始める場合は、もう一度スキルを起動してください。'
            ;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// タイマー停止
const TimerStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent');
    },
    handle(handlerInput) {
        let audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;

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

        time = Math.round(time / 10) * 10;
        let h = Math.floor(time / 3600000);
        time %= 3600000
        let m = Math.floor(time / 60000);
        time %= 60000;
        let s = Math.floor(time / 1000);
        time %= 1000;
        let ms = ('000' + time).slice(-4).substring(1, 3);
        let timeStr = '';
        if (h > 0) {
            timeStr = h + "時間" + m + "分" + s + "秒";
        } else if (m > 0) {
            timeStr = m + "分" + s + "秒";
        } else {
            timeStr = s + "秒";
        }
        const speechStr = `
            <speak>
                ${timeStr}<say-as interpret-as="digits">${ms}</say-as>です。
            </speak>
        `;
        console.log(`タイマー停止 : ${totalMsec}(${timeStr + ms})`);

        const cardStr = `
            ${timeStr + ms}
        `;

        return handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechStr)
            .withSimpleCard('計測結果', cardStr)
            .getResponse();
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

        return handlerInput.responseBuilder
            .speak('計測を再開します。')
            .addAudioPlayerPlayDirective('REPLACE_ALL', timerSoundUrl, token, offset, null, audioMetaData)
            .getResponse();
    }
};

// 何を購入できるかの説明
const WhatCanIBuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhatCanIBuyIntent';
    },
    handle(handlerInput) {
        console.log('商品説明');

        return handlerInput.responseBuilder
            .speak(`
                このスキルでは、拡張パックを購入することができます。
                拡張パックを利用すると最大5時間までの計測ができるようになります。
                購入する場合は、「拡張パックを購入」のように言ってください。どうしますか?
            `)
            .reprompt('どうしますか？')
            .getResponse();
    },
};

// ユーザから何もしない意思を示されたとき(購入しない、計測再開しないなど)
const DoNothingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'DontBuyIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        console.log('何もしない');
        return handlerInput.responseBuilder
            .speak('わかりました。スキルを終了します。')
            .getResponse();
    },
};

// 購入処理
const BuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'BuyIntent';
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


// TODO 何を買えるかを実装
// TODO ヘルプに追記
// TODO 音声を作成
// TODO 音声分岐を作成
// TODO カードをAPL化(画面対応ならAPL、そうじゃないならカードで使い分けとか)
// TODO docsから不要なドキュメントを除去(承認された後)



// 購入処理からの復帰
const BuyResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response' &&
            (handlerInput.requestEnvelope.request.name === 'Buy' ||
                handlerInput.requestEnvelope.request.name === 'Upsell');
    },
    handle(handlerInput) {
        console.log('購入処理から復帰');


        //   const locale = handlerInput.requestEnvelope.request.locale;
        //   const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
        //   const productId = handlerInput.requestEnvelope.request.payload.productId;

        //   return ms.getInSkillProducts(locale).then(function handlePurchaseResponse(result) {
        //     const product = result.inSkillProducts.filter(record => record.productId === productId);
        //     console.log(`PRODUCT = ${JSON.stringify(product)}`);
        //     if (handlerInput.requestEnvelope.request.status.code === '200') {
        //       let speakOutput;
        //       let repromptOutput;
        //       let filteredFacts;
        //       let categoryFacts = ALL_FACTS;
        //       switch (handlerInput.requestEnvelope.request.payload.purchaseResult) {
        //         case 'ACCEPTED':
        //           if (product[0].referenceName !== 'all_access') categoryFacts = ALL_FACTS.filter(record => record.type === product[0].referenceName.replace('_pack', ''));

        //           speakOutput = `You have unlocked the ${product[0].name}.  Here is your ${product[0].referenceName.replace('_pack', '').replace('all_access', '')} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
        //           repromptOutput = getRandomYesNoQuestion();
        //           break;
        //         case 'DECLINED':
        //           if (handlerInput.requestEnvelope.request.name === 'Buy') {
        //             // response when declined buy request
        //             speakOutput = `Thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
        //             repromptOutput = 'Would you like another random fact?';
        //             break;
        //           }
        //           // response when declined upsell request
        //           filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
        //           speakOutput = `OK.  Here's a random fact: ${getRandomFact(filteredFacts)} Would you like another random fact?`;
        //           repromptOutput = 'Would you like another random fact?';
        //           break;
        //         case 'ALREADY_PURCHASED':
        //           // may have access to more than what was asked for, but give them a random
        //           // fact from the product they asked to buy
        //           if (product[0].referenceName !== 'all_access') categoryFacts = ALL_FACTS.filter(record => record.type === product[0].referenceName.replace('_pack', ''));

        //           speakOutput = `Here is your ${product[0].referenceName.replace('_pack', '').replace('all_access', '')} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
        //           repromptOutput = getRandomYesNoQuestion();
        //           break;
        //         default:
        //           console.log(`unhandled purchaseResult: ${handlerInput.requestEnvelope.payload.purchaseResult}`);
        //           speakOutput = `Something unexpected happened, but thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
        //           repromptOutput = 'Would you like another random fact?';
        //           break;
        //       }
        //       return handlerInput.responseBuilder
        //         .speak(speakOutput)
        //         .reprompt(repromptOutput)
        //         .getResponse();
        //     }
        //     // Something failed.
        //     console.log(`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`);

        return handlerInput.responseBuilder
            .speak('購入の後処理です')
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
// TODO 無効にする
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
