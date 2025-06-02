// DOM 요소
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// 로그인 폼 제출 처리
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('로그인한 사용자 UID:', user.uid);
        console.log('허용된 UID:', ALLOWED_UID);
        console.log('UID 일치 여부:', user.uid === ALLOWED_UID);
        
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            await auth.signOut();
            errorMessage.textContent = '접근 권한이 없습니다.';
            errorMessage.style.display = 'block';
            return;
        }
        
        successMessage.textContent = '로그인 성공!';
        successMessage.style.display = 'block';
        
        // 1초 후 대시보드로 이동
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1000);
    } catch (error) {
        errorMessage.style.display = 'block';
        
        // 에러 메시지 한글화
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage.textContent = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/user-not-found':
                errorMessage.textContent = '등록되지 않은 이메일입니다.';
                break;
            case 'auth/wrong-password':
                errorMessage.textContent = '잘못된 비밀번호입니다.';
                break;
            default:
                errorMessage.textContent = error.message;
        }
    }
});