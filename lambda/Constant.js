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

        // 商品ID
        this.productId = 'amzn1.adg.product.8c5cd6be-8925-44ac-9e0d-8552251d8d3e';

        // タイマー用ファイル(プレフィックス)
        // this.timerSoundUrlPrefix = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_';
        this.timerSoundUrlPrefix = 'https://uemuram.github.io/alexa-stopwatch/timer_';
        // トークン(プレフィックス)
        this.tokenPrefix = 'token_';
        // 対応しているファイルの最大インデックス(0始まり)
        this.timerIdxLimit = 7;
        // 無料で再生できるファイルの最大インデックス(0始まり)
        this.freeTimerIdxLimit = 1;
        // 各ファイルの時間(ミリ秒) ※切れ目の都合で統一できなかったためそれぞれ持たせた
        this.timerSoundLengthMs = [
            1805000,
            1800000,
            1801000,
            1799000,
            1801000,
            1799000,
            1801000,
            1799000,
            // 1801000,
            // 1799000,
        ];

        // 何回目の起動でアップセルを出すか
        this.firstUpSellTime = 3;
        // 一度アップセルを出した後、何回後間隔でアップセルを出すか
        this.upSellFrequency = 20;


        // 終了用オーディオ
        //        this.timerFinishUrl = 'https://d1u8rmy92g9zyv.cloudfront.net/stopwatch/timer_finish.mp3';
        this.timerFinishUrl = 'https://uemuram.github.io/alexa-stopwatch/timer_finish.mp3';
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
        };

        this.timerFinishMetaData = {
            "title": "-",
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
        };

    }

}

module.exports = Constant;