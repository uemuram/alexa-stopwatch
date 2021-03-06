// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const Adapter = require('ask-sdk-dynamodb-persistence-adapter');

const CommonUtil = require('./CommonUtil.js');
const util = new CommonUtil();

const Logic = require('./Logic.js');
const logic = new Logic();

const Constant = require('./Constant');
const c = new Constant();

// スキル起動 & 計測開始
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        console.log('【スキル起動 & 計測開始】');

        // アップセルを読み上げるかの判定(商品未購入 & 一定回数上限に到達)
        const entitled = await logic.isEnitledExpansionPack(handlerInput);
        if (
            !entitled
            && await util.getPersistentValue(handlerInput, "reach_limit_count") >= c.upSellFrequency
        ) {
            // 条件を満たす場合はカウンターをリセットしてアップセルに遷移
            await util.setPersistentValue(handlerInput, "reach_limit_count", 0);
            util.setState(handlerInput, c.UNDER_PURCHASE);
            return handlerInput.responseBuilder
                .addDirective({
                    type: 'Connections.SendRequest',
                    name: 'Upsell',
                    payload: {
                        InSkillProduct: {
                            productId: c.productId,
                        },
                        upsellMessage: 'ご利用ありがとうございます。ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。詳細を聞きますか?'
                    },
                    token: 'upsellToken',
                })
                .getResponse();
        }

        // 計測開始
        util.setState(handlerInput, c.TIMER_RUNNING);
        return logic.getStartTimerResponse(handlerInput, '計測を開始します。');
    }
};

// 計測開始
const TimerStartIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (util.checkStrictSlotMatch(handlerInput, 'TimerStartIntent', 'TimerStartOrder')
                || (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' && util.checkState(handlerInput, c.CONFIRM_RUN_TIMER))
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StartOverIntent');
    },
    async handle(handlerInput) {
        console.log('【計測開始】');
        util.setState(handlerInput, c.TIMER_RUNNING);
        return logic.getStartTimerResponse(handlerInput, '計測を開始します。');
    }
};

// 計測停止
//TODO rectangleでエラーになっているかも?
//2021/02/02/[4]ad10cc3f3f6a4145a55f75556aa7aad8
// errorで検索
// https://developer.amazon.com/ja-JP/docs/alexa/alexa-presentation-language/use-apl-with-ask-sdk.html
// if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']){
const TimerStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent');
    },
    async handle(handlerInput) {
        console.log('【計測停止】');

        const audioInfo = logic.getAudioInfo(handlerInput);

        // 終了メッセージ再生中は何もしない
        if (audioInfo.token == c.timerFinishToken) {
            return handlerInput.responseBuilder
                .addAudioPlayerStopDirective()
                .getResponse();
        }

        // 停止した時刻を計算
        let time = 0;
        for (let i = 0; i < audioInfo.idx; i++) {
            // それまでの累積時刻
            time += c.timerSoundLengthMs[i];
        }
        // 現トラック分を加算
        time += audioInfo.offsetInMilliseconds;
        // カウントダウンの分を減らす
        time -= 4000;

        const totalMsec = time;
        // タイマー音声内でまだ開始していなかったらキャンセル。
        if (time < 0) {
            return handlerInput.responseBuilder
                .addAudioPlayerStopDirective()
                .speak('停止します。')
                .getResponse();
        }
        const timerStr = logic.getTimerStr(time);
        const speechStr = `
            <speak>
                ${timerStr.hhmmss_read}<say-as interpret-as="digits">${timerStr.ms}</say-as>です。
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
        const entitled = await logic.isEnitledExpansionPack(handlerInput);
        if (!entitled) {
            cardBody += '\n・時間を延ばす：「アレクサ、シンプルストップウォッチで拡張パック」';
        }

        let response = handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechStr)
            .withSimpleCard(cardTitle, cardBody);

        // 画面利用可能であれば画面を追加
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
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
                version: '1.5',
                document: aplDocument,
                datasources: aplDataSource
            })
        }

        util.setState(handlerInput, c.TIMER_STOPPING);
        return response.getResponse();
    }
};

// 計測再開
const TimerRestartIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent');
    },
    handle(handlerInput) {
        console.log('【計測再開】');

        util.setState(handlerInput, c.TIMER_RUNNING);
        return logic.getRestartTimerResponse(handlerInput, '計測を再開します。');
    }
};

// 何を購入できるかの説明
const WhatCanIBuyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
            util.checkStrictSlotMatch(handlerInput, 'WhatCanIBuyIntent', 'WhatCanIBuyOrder');
    },
    async handle(handlerInput) {
        console.log('【商品説明】');

        // 拡張パック購入状況をチェック
        const entitled = await logic.isEnitledExpansionPack(handlerInput);

        // 購入済み
        if (entitled) {
            util.setState(handlerInput, c.CONFIRM_RUN_TIMER);
            return handlerInput.responseBuilder
                .speak(`
                    ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。
                    拡張パックはすでにお持ちです。
                    続いて計測を行いますか?
                `)
                .reprompt('計測を行いますか?')
                .getResponse();
        };

        util.setState(handlerInput, c.CONFIRM_PURCHASE);
        return handlerInput.responseBuilder
            .speak(`
                ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。
                詳細を聞きますか?
            `)
            .reprompt('詳細を聞きますか?')
            .getResponse();
    },
};

// ユーザから何もしない意思を示されたとき(購入しない、計測再開しないなど)
const DoNothingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (util.checkStrictSlotMatch(handlerInput, 'DontBuyIntent', 'DontBuyOrder')
                || util.checkStrictSlotMatch(handlerInput, 'DenyIntent', 'DenyOrder')
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        console.log('【何もしない】');

        util.setState(handlerInput, c.SKILL_END);
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
                || (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent' && util.checkState(handlerInput, c.CONFIRM_PURCHASE))
            );
    },
    handle(handlerInput) {
        console.log('【購入処理】');

        // Alexa標準の購入処理に進む
        util.setState(handlerInput, c.UNDER_PURCHASE);
        return handlerInput.responseBuilder
            .addDirective({
                type: 'Connections.SendRequest',
                name: 'Buy',
                payload: {
                    InSkillProduct: {
                        productId: c.productId,
                    },
                },
                token: 'correlationToken',
            })
            .getResponse();
    },
};

// 購入処理からの復帰
const BuyResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response' &&
            (handlerInput.requestEnvelope.request.name === 'Buy' ||
                handlerInput.requestEnvelope.request.name === 'Upsell' ||
                handlerInput.requestEnvelope.request.name === 'Cancel'
            );
    },
    async handle(handlerInput) {
        console.log('【購入処理から復帰】');

        // 購入した場合は記録
        if (handlerInput.requestEnvelope.request.status.code === '200'
            && handlerInput.requestEnvelope.request.payload.purchaseResult == 'ACCEPTED') {
            console.log('購入した');
            await util.setPersistentValue(handlerInput, "purchased", true);
        }

        util.setState(handlerInput, c.CONFIRM_RUN_TIMER);
        return handlerInput.responseBuilder
            .speak(`続いて計測を行いますか?`)
            .reprompt('計測を行いますか?')
            .getResponse();
    },
};

// 購入のキャンセル
const RefundSkillItemIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && util.checkStrictSlotMatch(handlerInput, 'RefundSkillItemIntent', 'RefundSkillItemOrder');
    },
    handle(handlerInput) {
        console.log('【購入のキャンセル】');

        // Alexa標準の購入処理に進む
        util.setState(handlerInput, c.UNDER_REFUND);
        return handlerInput.responseBuilder
            .addDirective({
                type: 'Connections.SendRequest',
                name: 'Cancel',
                payload: {
                    InSkillProduct: {
                        productId: c.productId,
                    },
                },
                token: 'correlationToken',
            })
            .getResponse();
    },
};

// オーディオ終了間際のハンドラ
const PlaybackNearlyFinishedHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'AudioPlayer.PlaybackNearlyFinished';
    },
    async handle(handlerInput) {
        console.log('【終了間際】');

        // 現在再生中のオーディオの情報を取得
        const audioInfo = logic.getAudioInfo(handlerInput);

        // 終了音声再生中であれば何もしない
        if (audioInfo.token === c.timerFinishToken) {
            return handlerInput.responseBuilder
                .getResponse();
        }

        // 次のインデックス
        const nextIdx = audioInfo.idx + 1;

        // 商品未購入であれば終了させる
        const entitled = await logic.isEnitledExpansionPack(handlerInput);
        if (!entitled && nextIdx > c.freeTimerIdxLimit) {
            console.log(`商品未購入のため終了`);

            // 上限に到達した回数をチェック
            const reachLimitCount = await util.getPersistentValue(handlerInput, "reach_limit_count");
            if (reachLimitCount == null) {
                // 上限到達回数の情報がない場合は回数をセット(次の起動時にアップセルを読み上げるようにする)
                await util.setPersistentValue(handlerInput, "reach_limit_count", c.upSellFrequency);
            } else {
                // 上限到達回数の情報がある場合はインクリメント
                await util.setPersistentValue(handlerInput, "reach_limit_count", reachLimitCount + 1);
            }

            return handlerInput.responseBuilder
                .addAudioPlayerPlayDirective('ENQUEUE', c.timerFinishUrl, c.timerFinishToken, 0, audioInfo.token, c.timerFinishMetaData)
                .getResponse();
        }

        // 上限に達していれば終了させる
        if (nextIdx > c.timerIdxLimit) {
            console.log(`上限到達のため終了`);
            return handlerInput.responseBuilder
                .addAudioPlayerPlayDirective('ENQUEUE', c.timerFinishUrl, c.timerFinishToken, 0, audioInfo.token, c.timerFinishMetaData)
                .getResponse();
        }

        // 次のタイマー音声をセット
        const nextToken = logic.generateToken(nextIdx);

        const nextSoundurl = `${c.timerSoundUrlPrefix}${nextIdx}.mp3`;
        console.log(`次トークン : ${nextToken}`);

        return handlerInput.responseBuilder
            .addAudioPlayerPlayDirective('ENQUEUE', nextSoundurl, nextToken, 0, audioInfo.token, c.audioMetaData)
            .getResponse();
    }
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
        console.log('【計測停止(画面)】');
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
        console.log('【計測再開(画面)】');
        return logic.getRestartTimerResponse(handlerInput, null);
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
            + 'また、計測時間は最大1時間ですが、拡張パックを購入すると最大4時間に拡張できます。'
            + '拡張する場合は、「アレクサ、シンプルストップウォッチで拡張パック」、のように言ってください。'
            + '計測を行いますか?'
            ;

        util.setState(handlerInput, c.CONFIRM_RUN_TIMER);
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
        RefundSkillItemIntentHandler,
        PlaybackNearlyFinishedHandler,
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
    .withPersistenceAdapter(
        new Adapter.DynamoDbPersistenceAdapter(
            {
                tableName: 'alexa_stopwatch_persistent',
                createTable: true
            })
    )
    .lambda();
