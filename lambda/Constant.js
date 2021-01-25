class Constant {

    constructor() {

        // ステータス
        this.TIMER_RUNNING = 0;     // タイマー実行中
        this.TIMER_STOPPING = 1;    // タイマー停止中
        this.CONFIRM_PURCHASE = 2;  // 購入確認中
        this.UNDER_PURCHASE = 3;    // 購入処理中
        this.UNDER_REFUND = 4; // タイマー実行確認中
        this.CONFIRM_RUN_TIMER = 5; // タイマー実行確認中
        this.SKILL_END = 6;         // スキル終了

        // タイマー用ファイル(プレフィックス)
        this.timerSoundUrlPrefix = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_';
        // トークン(プレフィックス)
        this.tokenPrefix = 'token_';
        // 対応しているファイル数(3なら3時間計測できる)
        this.timerIdxLimit = 3;

        // 終了用オーディオ
        this.timerFinishUrl = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_finish.mp3';
        this.timerFinishToken = 'timer_finish';

        // オーディオ関連データ
        this.audioMetaData = {
            "title": "計測",
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

    }

}

module.exports = Constant;