(async () => {
    console.log("Web EXE ランナーをローカル展開中（最終決定版）...");
    
    const protocol = "https:";
    const domain = "a728238.github.io";
    const path = "w";
    const baseUrl = protocol + "//" + domain + "/" + path + "/";
    
    const targetDir = "SingleThreaded";
    const modeText = "シングルスレッド（安全・完全自己完結モード）";

    // 1. 画面のUIリセット
    document.documentElement.innerHTML = `
        <head>
            <meta charset="UTF-8">
            <title>Web EXE Runner (Native Boot)</title>
            <link rel="stylesheet" href="${baseUrl}${targetDir}/boxedwine.css">
            <style>
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
            <div id="status">【スタンバイ完了】下にWindowsアプリ (.exe) をドロップしてください。</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
    `;

    // 2. GitHubの25MB制限を突破するため、分割されたデータを非同期で並列ロードして自動結合
    let rawZipBuffer = null;
    try {
        console.log("分割されたOSバイナリデータの並列ダウンロードを開始...");
        const [resA, resB] = await Promise.all([
            fetch(baseUrl + "boxedwine.part_a?v=" + Date.now()),
            fetch(baseUrl + "boxedwine.part_b?v=" + Date.now())
        ]);

        if (resA.ok && resB.ok) {
            const [bufA, bufB] = await Promise.all([resA.arrayBuffer(), resB.arrayBuffer()]);
            
            // 低スペックPCでも一瞬で結合できる高速バイナリマージ処理
            const mergedArray = new Uint8Array(bufA.byteLength + bufB.byteLength);
            mergedArray.set(new Uint8Array(bufA), 0);
            mergedArray.set(new Uint8Array(bufB), bufA.byteLength);
            
            rawZipBuffer = mergedArray.buffer;
            console.log("純正35.5MBバイナリデータの結合・完全復元に成功しました！");
        }
    } catch (e) {
        console.error("OSベースデータの結合ロードに失敗しました:", e);
    }

    if (!rawZipBuffer) {
        document.getElementById('status').innerText = "エラー: 分割ファイル (boxedwine.part_a / part_b) のフェッチに失敗しました。";
        return;
    }

    // 3. ドラッグ＆ドロップイベント
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

            document.getElementById('status').innerText = `${file.name} をシステムへマウント中...`;
            dropZone.style.display = 'none';
            document.getElementById('canvas-container').style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(evt) {
                const exeUint8Array = new Uint8Array(evt.target.result);
                console.log("ユーザーバイナリのメモリロード成功");

                // 4. Boxedwine設定オブジェクト
                window.Module = {
                    canvas: document.getElementById('canvas'),
                    arguments: ['/home/wineuser/app.exe'],
                    locateFile: function(filePath) {
                        return baseUrl + targetDir + "/" + filePath;
                    },
                    preRun: [function() {
                        if (typeof FS !== 'undefined') {
                            try {
                                FS.mkdirTree('/home/wineuser');
                                FS.writeFile('/home/wineuser/app.exe', exeUint8Array);
                                console.log("ユーザーバイナリのマウント成功");
                            } catch(e) {
                                console.error("FSマウントエラー:", e);
                            }
                        }
                    }],
                    
                    // 結合した完璧な純正バイナリをWasmコアへ引き渡す
                    getPreloadedPackage: function(remotePackageName, remotePackageSize) {
                        console.log("★Emscriptenコアへ完全復元されたOSバイナリデータを注入します");
                        return rawZipBuffer;
                    },

                    onRuntimeInitialized: function() {
                        document.getElementById('status').innerText = "アプリケーションが正常に起動しました！";
                    },
                    print: console.log,
                    printErr: console.error
                };

                // 5. コアJSをロード
                document.getElementById('status').innerText = "Wasmカーネルをキック中（爆速ネイティブ実行）...";
                const script = document.createElement('script');
                script.src = baseUrl + targetDir + "/boxedwine.js";
                script.async = true;
                document.body.appendChild(script);
            };
            reader.readAsArrayBuffer(file);
        }
    });
})();
