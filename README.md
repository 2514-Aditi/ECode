
# ⚡ ECode – Scalable Code Execution Engine  

ECode is a **code execution platform** that compiles and runs programs in
**C++, Python & Java** - similar to platforms like HackerRank & LeetCode.

---

## 🔥 Features

| Feature | Details |
|---|---|
| Code Editor | Monaco (VS-Code engine) |
| Supported Languages | C++, Python, Java |
| Backend Execution | child_process.spawn + temp sandbox |
| Security | Timeout kill + isolated directory |
| UI | Minimal but functional |
| Theme |  Dark / Light toggle (including Monaco editor) |
| No external judge APIs | 100% locally executed |

---

## 🛠 Requirements

| Dependency | Used For |
|---|---|
| Node.js 18+ | API server |
| Python | Execute python code |
| g++ | Compile C++ |
| Java JDK (`javac` + `java`) | Compile + run Java |

Check availability:

```
node -v
python --version
g++ --version
javac -version
java -version
```

---

## ⚙ Installation & Running

### Backend

```
cd backend
npm install
npm start
```

Server starts on → **http://localhost:4000**

---

### Frontend

```
cd frontend
npm install
npm run dev
```

Open browser → **http://localhost:5173**

---

## 📈 Future Extensions

- Problem sets + test input system
- Execution leaderboard + analytics
- Submission history + database
- AI feedback scoring

---

## 🏁 Final Summary

ECode is a **deliberately focused execution engine** - not a full competitive programming environment.  
