// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const timerSoundUrl = 'https://uemuram.github.io/alexa-stopwatch/timer.mp3';
const audioMetaData = {
    "title": "計測中",
    "subtitle": "「アレクサ、ストップ」で停止",
    "art": {
        "sources": [
            {
                "url": "https://uemuram.github.io/alexa-stopwatch/audio_art.png"
            }
        ]
    },
    "backgroundImage": {
        "sources": [
            {
                "url": "https://uemuram.github.io/alexa-stopwatch/audio_backgroundImage.png"
            }
        ]
    }
}

const Speech = require('ssml-builder');

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
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
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
        let ms = ('000' + time).slice(-4).substring(1,3);
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
        let cardStr = timeStr + ms;
        console.log(`タイマー停止 : ${totalMsec}(${cardStr})`);

        return handlerInput.responseBuilder
            .addAudioPlayerStopDirective()
            .speak(speechStr)
            .withSimpleCard('シンプルストップウォッチ : 計測結果', cardStr)
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


// // リクエストインターセプター(エラー調査用)
// const RequestLog = {
//     process(handlerInput) {
//         //console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
//         console.log("HANDLER INPUT = " + JSON.stringify(handlerInput));
//         console.log("REQUEST TYPE =  " + Alexa.getRequestType(handlerInput.requestEnvelope));
//         return;
//     }
// };


// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        TimerStopIntentHandler,
        TimerRestartIntentHandler,
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
    //.addRequestInterceptors(RequestLog)
    .lambda();
