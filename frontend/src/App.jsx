import React, { useState, useEffect, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { submitCode, getJobStatus } from './api.js';

const starterCode = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    if (!(cin >> a >> b)) return 0;
    cout << (a + b) << "\\n";
    return 0;
}
`,
  python: `a, b = map(int, input().split())
print(a + b)
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}
`
};

export default function App() {
  const monaco = useMonaco();  
  const [dark, setDark] = useState(false);

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(starterCode.cpp);
  const [stdin, setStdin] = useState('2 3');
  const [status, setStatus] = useState(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    setCode(starterCode[language]);
  }, [language]);

  useEffect(() => {
    if (monaco) {
      monaco.editor.setTheme(dark ? "vs-dark" : "vs-light");
    }
  }, [dark, monaco]);

  useEffect(() => {
    return () => pollIntervalRef.current && clearInterval(pollIntervalRef.current);
  }, []);

  const startPolling = (id) => {
    pollIntervalRef.current && clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getJobStatus(id);
        setStatus(res.status);
        setOutput(res.output || '');
        setError(res.error || '');
        if (res.status === 'COMPLETED' || res.status === 'ERROR') {
          setIsRunning(false);
          clearInterval(pollIntervalRef.current);
        }
      } catch {
        setIsRunning(false);
        clearInterval(pollIntervalRef.current);
      }
    }, 1000);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setStatus('PENDING'); setOutput(''); setError('');
    try {
      const res = await submitCode({ language, code, stdin });
      startPolling(res.jobId);
    } catch {
      setIsRunning(false);
      setError('Failed to submit job.');
    }
  };

  return (
    <div className={`app-container ${dark ? "dark-mode" : ""}`}>
      <div className="header"
        style={{ 
          fontSize: "34px", 
          fontWeight: "900", 
          letterSpacing: "2px",
          }}
          > ECode
        <button 
          onClick={() => setDark(!dark)}
          style={{
            float:"right", padding:"6px 12px", borderRadius:"4px",
            background: dark ? "#444" : "#111", color:"#fff",
            border:"none", cursor:"pointer", marginRight:"10px"
          }}
        >
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="controls-row">
            <select value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>

            <button className="run-button" onClick={handleRun} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>

          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={v => setCode(v ?? '')}
            theme={dark ? "vs-dark" : "vs-light"} 
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>

        <div className="right-panel">
          <textarea className="stdin-area" value={stdin} onChange={e => setStdin(e.target.value)} />

          <strong>Status:</strong> {status || 'IDLE'}
          <div className="result-box">
            {output && output}
            {error && `\n[stderr]: ${error}`}
          </div>
        </div>
      </div>
    </div>
  );
}
