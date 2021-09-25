class Constant {

    constructor() {

        this.constant = {
            ja: {
                MESSAGE_START_MEASURE: '計測を開始します。',
                MESSAGE_STOP_MEASURE: '停止します。',
                MESSAGE_RESUME_MEASURE: '計測を再開します。',
                MESSAGE_CONFIRM_MEASURE: '計測を行いますか?',
                MESSAGE_CONFIRM_CONTINUE_MEASURE: '続いて計測を行いますか?',

                MESSAGE_UPSELL: 'ご利用ありがとうございます。ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。詳細を聞きますか?',
                MESSAGE_PRODUCT_DESCRIPTION_ALREADY_PURCHASED: 'ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。'
                    + '拡張パックはすでにお持ちです。続いて計測を行いますか?',
                MESSAGE_PRODUCT_DESCRIPTION_NOT_PURCHASED: 'ストップウォッチの計測時間は最大1時間ですが、拡張パックを購入するとさらに拡張できます。詳細を聞きますか?',
                MESSAGE_PRODUCT_DESCRIPTION_NOT_PURCHASED_REPROMPT: '詳細を聞きますか?',

                MESSAGE_ERROR: 'エラーが発生しました。もう一度お試しください。',
                MESSAGE_UNEXPECTED_CALL: '想定外の呼び出しが発生しました。もう一度お試しください。',
                MESSAGE_PLEASE_REUSE: 'またご利用ください。',

                MESSAGE_HELP: 'シンプルなストップウォッチスキルです。'
                    + 'スキルを起動するとすぐにストップウォッチがスタートし、カウント音が流れている間、時間計測を行います。'
                    + 'ストップウォッチを止めるにはカウント音が流れているときに「アレクサ、ストップ」と言ってください。'
                    + 'ストップ後に計測を再開するには、「アレクサ、再開」と言ってください。'
                    + 'ストップ後に新たに計測を始める場合は、「アレクサ、最初から」と言ってください。'
                    + 'また、計測時間は最大1時間ですが、拡張パックを購入すると最大4時間に拡張できます。'
                    + '拡張する場合は、「アレクサ、シンプルストップウォッチで拡張パック」、のように言ってください。'
                    + '計測を行いますか?',

                CARD_TIPS_RESUME: '・計測を再開　：「アレクサ、再開」',
                CARD_TIPS_START_OVER: '・最初から計測：「アレクサ、最初から」',
                CARD_TIPS_BUY_ORDER: '・時間を延ばす：「アレクサ、シンプルストップウォッチで拡張パック」',

                AUDIO_TITLE: '計測',
                AUDIO_SUBTITLE: '「アレクサ、ストップ」で停止',
            },

            en: {
                MESSAGE_START_MEASURE: 'Start the measurement.',
                MESSAGE_STOP_MEASURE: 'Stoped.',
                MESSAGE_RESUME_MEASURE: 'Resume the measurement.',
                MESSAGE_CONFIRM_MEASURE: 'Do you want to take measurements?',
                MESSAGE_CONFIRM_CONTINUE_MEASURE: 'Do you want to continue measuring?',

                MESSAGE_UPSELL: 'Thank you for your interest. The maximum measurement time of the stopwatch is one hour, '
                    + 'but it can be further extended by purchasing an expansion pack. Would you like to hear more?',
                MESSAGE_PRODUCT_DESCRIPTION_ALREADY_PURCHASED: 'The maximum measurement time of the stopwatch is one hour, but it can be further extended by purchasing an expansion pack. '
                    + 'You have the expansion pack already. Do you want to continue measuring?',
                MESSAGE_PRODUCT_DESCRIPTION_NOT_PURCHASED: 'The maximum measurement time of the stopwatch is one hour, '
                    + 'but it can be further extended by purchasing an expansion pack. Would you like to hear more?',
                MESSAGE_PRODUCT_DESCRIPTION_NOT_PURCHASED_REPROMPT: 'Would you like to hear more?',

                MESSAGE_ERROR: 'An error has occurred. Please try again.',
                MESSAGE_UNEXPECTED_CALL: 'An unexpected call has occurred. Please try again.',
                MESSAGE_PLEASE_REUSE: 'Please use this skill again.',

                MESSAGE_HELP: 'This is a simple stopwatch skill. '
                    + 'As soon as you start the skill, the stopwatch will start and measure the time while the counting sound is playing. '
                    + 'To stop the stopwatch, simply say "Alexa, stop". '
                    + 'To resume the measurement after stopping, say "Alexa, resume". '
                    + 'To start a new measurement after stopping, say "Alexa, start over". '
                    + 'The maximum measurement time is one hour, but it can be extended to four hours by purchasing an expansion pack. '
                    + 'To extend the time, say something like "Alexa, ask simple stopwatch to describe the expansion pack". '
                    + 'Do you want to take a measurement?',

                CARD_TIPS_RESUME: '・To restart the measurement     ："Alexa, resume."',
                CARD_TIPS_START_OVER: '・To measure from the beginning  ："Alexa, start over."',
                CARD_TIPS_BUY_ORDER: '・To extend the measurement time ："Alexa, ask simple stopwatch to describe the expansion pack."',

                AUDIO_TITLE: 'Measuring...',
                AUDIO_SUBTITLE: 'To stop the stopwatch, "Alexa, stop".',
            }
        }
    }

}

module.exports = Constant;