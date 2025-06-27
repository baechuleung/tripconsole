// 전역 변수 보호를 위한 즉시 실행 함수
(function() {
    // URL 파라미터에서 회원 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id');

    // Firebase 초기화 확인 함수
    function checkFirebaseAndInit() {
        if (typeof firebase === 'undefined' || typeof auth === 'undefined' || typeof db === 'undefined') {
            // Firebase가 아직 로드되지 않았으면 100ms 후 재시도
            setTimeout(checkFirebaseAndInit, 100);
            return;
        }

        // Firebase가 준비되면 인증 상태 확인
        auth.onAuthStateChanged((user) => {
            if (user) {
                // UID 검증 (관리자 권한 확인)
                if (user.uid !== ALLOWED_UID) {
                    auth.signOut();
                    window.location.href = '/login.html';
                    return;
                }
                // 회원 정보 로드
                if (memberId) {
                    loadMemberDetail(memberId);
                } else {
                    alert('회원 정보를 찾을 수 없습니다.');
                    history.back();
                }
            } else {
                window.location.href = '/login.html';
            }
        });
    }

    // 회원 상세정보 로드
    async function loadMemberDetail(id) {
        try {
            const doc = await db.collection('users').doc(id).get();
            
            if (doc.exists) {
                const member = doc.data();
                
                // 정보 표시
                document.getElementById('memberEmail').textContent = member.email || '-';
                document.getElementById('memberName').textContent = member.name || '-';
                document.getElementById('memberGender').textContent = getGenderText(member.gender);
                document.getElementById('memberReferredBy').textContent = member.referredBy || '-';
                document.getElementById('memberPoints').textContent = member.points || '0';
                document.getElementById('memberCreatedAt').textContent = formatDate(member.createdAt);
                document.getElementById('memberStatus').textContent = member.status || '활성';
                
                // 포인트 수정 버튼 추가
                if (typeof addPointEditButton === 'function') {
                    addPointEditButton(member.points || 0);
                }
                
                // 버튼 이벤트 설정
                setupButtonEvents(id);
            } else {
                alert('회원 정보를 찾을 수 없습니다.');
                history.back();
            }
        } catch (error) {
            console.error('회원 정보 로드 에러:', error);
            alert('회원 정보를 불러오는데 실패했습니다.');
        }
    }

    // 성별 텍스트 변환
    function getGenderText(gender) {
        switch (gender) {
            case 'male':
                return '남성';
            case 'female':
                return '여성';
            default:
                return gender || '-';
        }
    }

    // 버튼 이벤트 설정
    function setupButtonEvents(id) {
        // 수정 버튼
        document.getElementById('editBtn').addEventListener('click', () => {
            alert('수정 기능은 준비중입니다.');
        });
        
        // 삭제 버튼
        document.getElementById('deleteBtn').addEventListener('click', async () => {
            if (confirm('정말로 이 회원을 삭제하시겠습니까?')) {
                try {
                    await db.collection('users').doc(id).delete();
                    alert('회원이 삭제되었습니다.');
                    window.location.href = '/member/member-list.html';
                } catch (error) {
                    console.error('회원 삭제 에러:', error);
                    alert('회원 삭제에 실패했습니다.');
                }
            }
        });
    }

    // 날짜 포맷
    function formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
    }

    // 페이지 로드 시 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkFirebaseAndInit);
    } else {
        checkFirebaseAndInit();
    }
})();