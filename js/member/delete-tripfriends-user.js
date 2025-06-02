// delete-tripfriends-user.js
// 트립프렌즈 회원 완전 삭제 함수

async function deleteTripfriendsUser(memberId) {
    try {
        console.log('회원 삭제 시작:', memberId);
        
        // 1. Firestore에서 회원 정보 가져오기 (UID 확인용)
        const memberDoc = await db.collection('tripfriends_users').doc(memberId).get();
        
        if (!memberDoc.exists) {
            throw new Error('회원 정보를 찾을 수 없습니다.');
        }
        
        const memberData = memberDoc.data();
        const userUid = memberData.uid;
        
        console.log('삭제할 회원 UID:', userUid);
        
        // 2. Storage에서 프로필 이미지 폴더 삭제
        console.log('Storage 파일 삭제 시작...');
        try {
            const storageRef = storage.ref(`tripfriends_profiles/${memberId}`);
            
            // 폴더 내 모든 파일 목록 가져오기
            const listResult = await storageRef.listAll();
            
            // 각 파일 삭제
            const deletePromises = listResult.items.map(item => item.delete());
            await Promise.all(deletePromises);
            
            console.log('Storage 파일 삭제 완료');
        } catch (storageError) {
            console.log('Storage 삭제 중 오류 (파일이 없을 수 있음):', storageError);
        }
        
        // 3. Firestore에서 하위 컬렉션 삭제
        console.log('하위 컬렉션 삭제 시작...');
        
        // 하위 컬렉션들 삭제 (예: reviews, bookings 등이 있다면)
        const subcollections = ['reviews', 'bookings', 'messages']; // 실제 하위 컬렉션 이름으로 수정
        
        for (const subcollection of subcollections) {
            try {
                const subcollectionRef = db.collection('tripfriends_users').doc(memberId).collection(subcollection);
                const snapshot = await subcollectionRef.get();
                
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log(`${subcollection} 하위 컬렉션 삭제 완료`);
            } catch (subError) {
                console.log(`${subcollection} 하위 컬렉션 삭제 중 오류:`, subError);
            }
        }
        
        // 4. Firestore에서 메인 문서 삭제
        console.log('메인 문서 삭제...');
        await db.collection('tripfriends_users').doc(memberId).delete();
        console.log('Firestore 문서 삭제 완료');
        
        // 5. Authentication에서 사용자 삭제
        console.log('Authentication 사용자 삭제 시작...');
        if (userUid) {
            // Cloud Functions를 통해 다른 사용자 삭제
            // 또는 Admin SDK를 사용하는 서버 API 호출
            try {
                const deleteAuthUser = firebase.functions().httpsCallable('deleteUser');
                await deleteAuthUser({ uid: userUid });
                console.log('Authentication 사용자 삭제 완료');
            } catch (authError) {
                console.error('Authentication 삭제 중 오류:', authError);
                console.log('주의: Authentication 사용자는 수동으로 삭제해야 할 수 있습니다.');
            }
        }
        
        console.log('회원 삭제 완료!');
        return true;
        
    } catch (error) {
        console.error('회원 삭제 중 오류 발생:', error);
        throw error;
    }
}

// 삭제 확인 다이얼로그와 함께 삭제 실행
async function confirmAndDeleteTripfriendsUser(memberId, memberName) {
    const confirmMessage = `정말로 ${memberName || '이'} 회원을 완전히 삭제하시겠습니까?\n\n` +
                          `삭제되는 내용:\n` +
                          `- Firestore 회원 정보 및 하위 컬렉션\n` +
                          `- Storage 프로필 이미지\n` +
                          `- Authentication 계정\n\n` +
                          `이 작업은 되돌릴 수 없습니다!`;
    
    if (confirm(confirmMessage)) {
        try {
            // 로딩 표시 (선택사항)
            const deleteBtn = document.getElementById('deleteBtn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = '삭제 중...';
            }
            
            await deleteTripfriendsUser(memberId);
            
            alert('회원이 완전히 삭제되었습니다.');
            window.location.href = '/member/member-list.html';
            
        } catch (error) {
            alert('회원 삭제 중 오류가 발생했습니다: ' + error.message);
            
            // 버튼 복원
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '회원 삭제';
            }
        }
    }
}