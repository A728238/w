// boot.js - ドロップトリガー連動・完全オンデマンド起動版
(async () => {
    console.log("Web EXE ランナーをローカル展開中（即時自動起動）...");
    
    // 1. URL文字列の結合（AIバグ防止）
    const protocol = "https:";
    const domain = "a728238.github.io";
    const path = "w";
    const baseUrl = protocol + "//" + domain + "/" + path + "/";
    
    const targetDir = "SingleThreaded";
    const modeText = "シングルスレッド（安全・軽量・クラッシュレスモード）";

    // 2. 元サイトのCSSを遮断して画面をリセット
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
            <div id="status">システム環境（Wasm OS）を構築中...</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
    `;

    // 3. 起動用環境データ（boxedwine.zip）を事前にバックグラウンド取得
    let zipData = null;
    try {
        const response = await fetch(baseUrl + targetDir + "/boxedwine.zip");
        const arrayBuffer = await response.arrayBuffer();
        zipData = new Uint8Array(arrayBuffer);
        console.log("OSベースデータの読み込み完了");
    } catch (e) {
        console.error("OSベースデータの読み込みに失敗しました:", e);
    }

    // 4. Boxedwine のグローバル設定（初期設定では自動実行させない）
    window.Module = {
        canvas: document.getElementById('canvas'),
        arguments: [], // 【修正】初期起動時の自動引数を空にして即時シャットダウンを防止
        noInitialRun: true, // 【重要】Emscriptenの自動起動を一時停止、待機状態にする
        locateFile: function(filePath) {
            return baseUrl + targetDir + "/" + filePath;
        },
        preRun: [function() {
            if (typeof FS !== 'undefined' && zipData) {
                try {
                    FS.writeFile('boxedwine.zip', zipData);
                    console.log("仮想ファイルシステムへ環境をインジェクションしました");
                } catch(e) {
                    console.error("FSへの書き込みエラー:", e);
                }
            }
        }],
        onRuntimeInitialized: function() {
            document.getElementById('status').innerText = "準備完了！.exeファイルを読み込んでください。";
        },
        print: console.log,
        printErr: console.error
    };

    // 5. ドラッグ＆ドロップイベントの実装（ドロップされた瞬間にキック）
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0]; // 明示的に最初のファイルを取得
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
                    try { 
                        // ディレクトリの再生成とファイル配置
                        FS.mkdirTree('/home/wineuser'); 
                    } catch(err) {}
                    
                    FS.writeFile('/home/wineuser/app.exe', uint8Array);
                    document.getElementById('status').innerText = "アプリケーションを実行中...";
                    console.log("ユーザーバイナリのマウント成功。呼出を開始します。");
                    
                    // 【大修正】待機させておいたWasmメイン関数へ動的に引数を渡して、ここで初めて起動！
                    if (typeof window.Module.callMain !== 'undefined') {
                        window.Module.callMain(['/home/wineuser/app.exe']);
                    } else if (typeof shouldRunNow !== 'undefined') {
                        // フォールバック用の初期化実行
                        window.Module.arguments = ['/home/wineuser/app.exe'];
                        shouldRunNow();
                    }
                } else {
                    alert("システムの初期化が完了していません。");
                    location.reload();
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 6. コアJSをロード
    const script = document.createElement('script');
    script.src = baseUrl + targetDir + "/boxedwine.js";
    script.async = true;
    document.body.appendChild(script);
})();
