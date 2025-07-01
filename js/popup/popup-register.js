document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('popupForm');
    const imageFile = document.getElementById('imageFile');
    const imagePreview = document.getElementById('imagePreview');
    
    // 이미지 미리보기
    imageFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.style.display = 'block';
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="미리보기">`;
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
    });
    
    // 폼 제출
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';
        
        try {
            // 폼 데이터 수집
            const formData = new FormData(form);
            const title = formData.get('title');
            const startDate = new Date(formData.get('startDate'));
            const endDate = new Date(formData.get('endDate'));
            const priority = parseInt(formData.get('priority'));
            const isActive = formData.get('isActive') === 'true';
            const file = imageFile.files[0];
            
            // 날짜 유효성 검사
            if (startDate >= endDate) {
                alert('종료일은 시작일보다 늦어야 합니다.');
                submitBtn.disabled = false;
                submitBtn.textContent = '등록';
                return;
            }
            
            // 이미지 업로드
            let imageUrl = '';
            if (file) {
                // 파일명 생성 (timestamp + 원본파일명)
                const timestamp = Date.now();
                const fileName = `popups/${timestamp}_${file.name}`;
                
                // Storage에 업로드
                const storageRef = firebase.storage().ref();
                const fileRef = storageRef.child(fileName);
                const uploadTask = await fileRef.put(file);
                
                // 업로드된 파일의 URL 가져오기
                imageUrl = await uploadTask.ref.getDownloadURL();
            }
            
            // Firestore에 팝업 정보 저장
            const popupData = {
                title: title,
                imageUrl: imageUrl,
                startDate: firebase.firestore.Timestamp.fromDate(startDate),
                endDate: firebase.firestore.Timestamp.fromDate(endDate),
                priority: priority,
                isActive: isActive,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await firebase.firestore().collection('popups').add(popupData);
            
            alert('팝업이 성공적으로 등록되었습니다.');
            window.location.href = '/popup/popup-list.html';
            
        } catch (error) {
            console.error('팝업 등록 오류:', error);
            alert('팝업 등록 중 오류가 발생했습니다.');
            submitBtn.disabled = false;
            submitBtn.textContent = '등록';
        }
    });
});