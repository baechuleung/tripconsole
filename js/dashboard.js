// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('대시보드 - 현재 사용자 UID:', user.uid);
        console.log('대시보드 - 허용된 UID:', ALLOWED_UID);
        
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            console.log('권한 없음 - 로그아웃 처리');
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        
        // 사용자 이메일 표시
        document.getElementById('userEmail').textContent = user.email;
    } else {
        // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
        window.location.href = '/login.html';
    }
});

// 로그아웃 처리
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '/login.html';
    } catch (error) {
        console.error('로그아웃 에러:', error);
    }
});