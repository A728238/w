// boot.js - マルチスレッド強制突破 ＆ 元サイトCSS完全破棄版
(async () => {
    console.log("Web EXE ランナーをローカル展開中（即時自動起動）...");
    
    // 1. URL文字列の結合
    const protocol = "https:";
    const domain = "a728238.github.io";
    const path = "w";
    const baseUrl = protocol + "//" + domain + "/" + path + "/";
    
    const cpuCores = navigator.hardwareConcurrency || 1;
    let targetDir = "SingleThreaded";
    let modeText = "シングルスレッドモード";

    // 4コア以上ならマルチスレッドを強制発動
    if (cpuCores >= 4) {
        targetDir = "MultiThreaded";
        modeText = `マルチスレッド爆速モード (${cpuCores}コア検知)`;
    }

    // 2. 元サイトのCSS汚染やdocument.writeのブロックを完全に回避してリセット
    document.documentElement.innerHTML = `
        <head>
            <meta charset="UTF-8">
            <title>Web EXE Runner (Native Boot)</title>
            <link rel="stylesheet" href="${baseUrl}${targetDir}/boxedwine.css">
            <style>
                /* スタイルを完全隔離（他サイトのCSSの影響をリセット） */
                html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #f0f2f5 !important; font-family: sans-serif !important; }
                body { display: flex; flex-direction: column; align-items: center; padding: 20px; box-sizing: border-box; }
                h1 { color: #333; margin-top: 10px; }
                #mode-info { color: #7f8c8d; font-size: 13px; margin-bottom: 10px; }
                #status { font-weight: bold; color: #e67e22; margin-bottom: 20px; }
                #drop-zone { width: 80%; max-width: 600px; height: 150px; border: 3px dashed #4a90e2; background: #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-weight: bold; color: #4a90e2; box-sizing: border-box; }
                #canvas-container { display: none; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
                canvas { display: block; border: none; }
            </style>
        </head>
        <body>
            <h1>Web EXE ランナー (ネイティブ起動版)</h1>
            <div id="mode-info">動作モード: ${modeText}</div>
            <div id="status">システム環境（Wasm OS）を構築中...</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
    `;

    // 3. Boxedwine のグローバル設定（安全な直接書き込み方式）
    window.Module = {
        canvas: document.getElementById('canvas'),
        arguments: ['/home/wineuser/app.exe'],
        locateFile: function(filePath) {
            return baseUrl + targetDir + "/" + filePath;
        },
        // クラッシュの原因だった FS_createPreloadedFile を排除し、安全に仮想FSへ配置
        preRun: [function() {
            if (typeof FS !== 'undefined' && window.boxedwineZipData) {
                FS.writeFile('boxedwine.zip', window.boxedwineZipData);
                console.log("Windows OS環境データのインジェクション完了");
            }
        }],
        onRuntimeInitialized: function() {
            document.getElementById('status').innerText = "準備完了！.exeファイルを読み込んでください。";
        },
        print: console.log,
        printErr: console.error
    };

    // 4. エラーの原因となるクロスオリジン制約をインラインWorker化で完全破壊
    // (自動的にWorker生成関数を書き換え)
    const originalWorker = window.Worker;
    window.Worker = function(stringUrl) {
        if (stringUrl.startsWith(baseUrl)) {
            // 外部JSをBlobに変形させてブラウザ内部オリジンとして偽装起動
            const blobCode = `importScripts("${stringUrl}");`;
            const blob = new Blob([blobCode], { type: "application/javascript" });
            return new originalWorker(URL.createObjectURL(blob));
        }
        return new originalWorker(stringUrl);
    };

    // 5. 事前にバックグラウンドで純粋な「boxedwine.zip」をフェッチしてメモリに蓄積
    try {
        const response = await fetch(baseUrl + targetDir + "/boxedwine.zip");
        const arrayBuffer = await response.arrayBuffer();
        window.boxedwineZipData = new Uint8Array(arrayBuffer);
    } catch (e) {
        console.error("OS環境データの読み込みに失敗しました:", e);
    }

    // 6. ドラッグ＆ドロップイベントの実装
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (!file.name.endsWith('.exe')) {
                alert('Windowsの実行ファイル (.exe) を選択してください。');
                return;
            }

            document.getElementById('status').innerText = `${file.name} を解析中（爆速ネイティブ実行）...`;
            dropZone.style.display = 'none';
            document.getElementById('canvas-container').style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(evt) {
                const uint8Array = new Uint8Array(evt.target.result);
                if (typeof FS !== 'undefined') {
                    try { FS.mkdirTree('/home/wineuser'); } catch(err) {}
                    FS.writeFile('/home/wineuser/app.exe', uint8Array);
                    document.getElementById('status').innerText = "実行中...";
                    if (typeof window.Module.callMain !== 'undefined') {
                        window.Module.callMain(['/home/wineuser/app.exe']);
                    }
                } else {
                    alert("システムの初期化が完了していません。");
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 7. コアJSをロード
    const script = document.createElement('script');
    script.src = baseUrl + targetDir + "/boxedwine.js";
    script.async = true;
    document.body.appendChild(script);
})();
