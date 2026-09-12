// boot.js - about:blank の中身を自動で書き換えてシステムを起動するJS
export function startup() {
    console.log("Web EXE ランナーをローカル展開中...");
    
    const baseUrl = "https://a728238.github.io/w/";
    const cpuCores = navigator.hardwareConcurrency || 1;
    const supportsThreads = (typeof SharedArrayBuffer !== 'undefined');
    
    let targetDir = "SingleThreaded";
    let modeText = "シングルスレッド（安全・低スペックモード）";

    if (cpuCores >= 4 && supportsThreads) {
        targetDir = "MultiThreaded";
        modeText = `マルチスレッド（高速モード: ${cpuCores}コア）`;
    }

    // 1. about:blank のDOM（画面）を完全に上書き
    document.open();
    document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Web EXE Runner (Native Boot)</title>
            <link rel="stylesheet" href="${baseUrl}${targetDir}/boxedwine.css">
            <style>
                body { font-family: sans-serif; background: #f0f2f5; padding: 20px; text-align: center; }
                #drop-zone { width: 80%; max-width: 600px; height: 120px; border: 3px dashed #4a90e2; background: #fff; border-radius: 10px; display: flex; justify-content: center; align-items: center; cursor: pointer; margin: 20px auto; font-weight: bold; color: #4a90e2; }
                #canvas-container { display: none; background: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin: 0 auto; }
                #status { font-weight: bold; color: #e67e22; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Web EXE ランナー (ネイティブ起動版)</h1>
            <div id="mode-info">動作モード: ${modeText}</div>
            <div id="status">Wasmカーネルを読み込み中...</div>
            <div id="drop-zone">ここに Windows の .exe ファイルをドロップ</div>
            <div id="canvas-container"><canvas id="canvas" oncontextmenu="event.preventDefault()"></canvas></div>
        </body>
        </html>
    `);
    document.close();

    // 2. Boxedwineグローバル設定
    window.Module = {
        canvas: document.getElementById('canvas'),
        locateFile: function(path) {
            return `${baseUrl}${targetDir}/${path}`;
        },
        onRuntimeInitialized: function() {
            document.getElementById('status').innerText = "準備完了！.exeファイルを読み込んでください。";
        },
        print: console.log,
        printErr: console.error
    };

    // 3. ドラッグ＆ドロップイベントの実装
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.exe')) {
            document.getElementById('status').innerText = `${file.name} を解析中（爆速ネイティブ実行）...`;
            dropZone.style.display = 'none';
            document.getElementById('canvas-container').style.display = 'block';

            const reader = new FileReader();
            reader.onload = function(evt) {
                const uint8Array = new Uint8Array(evt.target.result);
                if (typeof FS !== 'undefined') {
                    FS.writeFile('/home/wineuser/app.exe', uint8Array);
                    window.Module.callMain(['/home/wineuser/app.exe']);
                    document.getElementById('status').innerText = "実行中";
                } else {
                    alert("Wasmの初期化が間に合っていません。数秒待ってから再ドロップしてください。");
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 4. コアWasmスクリプトの動的ロード
    const script = document.createElement('script');
    script.src = `${baseUrl}${targetDir}/boxedwine.js`;
    script.async = true;
    document.body.appendChild(script);
}
