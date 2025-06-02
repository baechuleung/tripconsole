// Firebase 설정이 로드될 때까지 대기
function checkAuthState() {
    if (typeof auth !== 'undefined' && typeof ALLOWED_UID !== 'undefined') {
        // 로그인 상태 확인
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('인덱스 - 현재 사용자 UID:', user.uid);
                console.log('인덱스 - 허용된 UID:', ALLOWED_UID);
                
                // UID 검증
                if (user.uid === ALLOWED_UID) {
                    // 허용된 사용자인 경우 대시보드로 이동
                    window.location.href = '/dashboard.html';
                } else {
                    // 권한이 없는 경우 로그아웃 후 로그인 페이지로
                    console.log('권한 없음 - 로그아웃 처리');
                    auth.signOut();
                    window.location.href = '/login.html';
                }
            } else {
                // 로그인되지 않은 경우 로그인 페이지로 이동
                window.location.href = '/login.html';
            }
        });
    } else {
        // Firebase가 아직 로드되지 않았으면 100ms 후 재시도
        setTimeout(checkAuthState, 100);
    }
}

// 실행
checkAuthState();