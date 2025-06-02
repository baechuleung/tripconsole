// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDWTuYddYBX53m0_J6OEtBb7eMjUq7vHjc",
    authDomain: "tripjoy-d309f.firebaseapp.com",
    databaseURL: "https://tripjoy-d309f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tripjoy-d309f",
    storageBucket: "tripjoy-d309f.firebasestorage.app",
    messagingSenderId: "485728455682",
    appId: "1:485728455682:web:c474a1bb301a6fffd5eb1b",
    measurementId: "G-NGMW6T2S41"
};

// Firebase 초기화 (이미 초기화되어 있으면 스킵)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // 이미 초기화된 앱 사용
}

// Firebase 서비스 초기화
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const database = firebase.database();

// 허용된 UID
const ALLOWED_UID = '8Vgvc5ryUUbGEhNyJ8ph6TIMZpE3';