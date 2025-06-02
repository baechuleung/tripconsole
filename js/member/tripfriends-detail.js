console.log('tripfriends-detail.js 시작');

// URL 파라미터에서 회원 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
const memberId = urlParams.get('id');
console.log('memberId:', memberId);

// 페이지 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생');
    
    // Firebase 체크
    setTimeout(() => {
        console.log('Firebase 체크 시작');
        console.log('typeof firebase:', typeof firebase);
        console.log('typeof auth:', typeof auth);
        console.log('typeof db:', typeof db);
        console.log('typeof ALLOWED_UID:', typeof ALLOWED_UID);
        
        if (typeof auth !== 'undefined') {
            console.log('auth 정의됨, onAuthStateChanged 시작');
            auth.onAuthStateChanged((user) => {
                console.log('인증 상태 변경:', user ? '로그인됨' : '로그아웃됨');
                if (user) {
                    console.log('사용자 UID:', user.uid);
                    console.log('ALLOWED_UID:', ALLOWED_UID);
                    
                    if (user.uid !== ALLOWED_UID) {
                        console.log('권한 없음');
                        auth.signOut();
                        window.location.href = '/login.html';
                        return;
                    }
                    
                    if (memberId) {
                        console.log('회원 정보 로드 시작');
                        loadMemberDetail();
                    } else {
                        alert('회원 정보를 찾을 수 없습니다.');
                        history.back();
                    }
                } else {
                    window.location.href = '/login.html';
                }
            });
        } else {
            console.error('auth가 정의되지 않음');
        }
    }, 500);
});

// 회원 상세정보 로드
async function loadMemberDetail() {
    console.log('loadMemberDetail 함수 시작');
    try {
        const doc = await db.collection('tripfriends_users').doc(memberId).get();
        console.log('문서 조회 완료:', doc.exists);
        
        if (doc.exists) {
            const member = doc.data();
            console.log('회원 데이터:', member);
            
            // 기본 정보
            document.getElementById('memberUid').textContent = member.uid || '-';
            document.getElementById('memberName').textContent = member.name || '-';
            document.getElementById('memberGender').textContent = getGenderText(member.gender);
            document.getElementById('memberBirthDate').textContent = formatBirthDate(member.birthDate);
            document.getElementById('memberPhone').textContent = formatPhone(member.phoneData);
            document.getElementById('memberIntroduction').textContent = member.introduction || '-';
            document.getElementById('memberReferrerCode').textContent = member.referrer_code || '-';
            
            // 활동 정보
            const locationText = await formatLocation(member.location);
            document.getElementById('memberLocation').textContent = locationText;
            document.getElementById('memberLanguages').textContent = formatLanguages(member.languages);
            document.getElementById('memberPricePerHour').textContent = formatPrice(member.pricePerHour, member.currencySymbol);
            document.getElementById('memberCurrency').textContent = `${member.currencyCode || '-'} (${member.currencySymbol || '-'})`;
            document.getElementById('memberPoint').textContent = member.point || '0';
            
            // 프로필 이미지
            if (member.profileImageUrl) {
                const profileImg = document.getElementById('memberProfileImage');
                profileImg.src = member.profileImageUrl;
                profileImg.style.display = 'block';
                profileImg.addEventListener('click', () => showImagePopup(member.profileImageUrl));
            }
            
            // 미디어 리스트
            if (member.profileMediaList && member.profileMediaList.length > 0) {
                const mediaList = document.getElementById('mediaList');
                member.profileMediaList.forEach((media) => {
                    if (media.type === 'image' && media.path) {
                        const img = document.createElement('img');
                        img.src = media.path;
                        img.className = 'media-item';
                        img.addEventListener('click', () => showImagePopup(media.path));
                        mediaList.appendChild(img);
                    } else if (media.type === 'video' && media.path) {
                        const video = document.createElement('video');
                        video.src = media.path;
                        video.className = 'media-item';
                        video.controls = true;
                        video.style.width = '200px';
                        video.style.height = '200px';
                        video.style.objectFit = 'cover';
                        mediaList.appendChild(video);
                    }
                });
            }
            
            // 인증 서류
            if (member.documentImageUrls && member.documentImageUrls.length > 0) {
                const documentList = document.getElementById('documentList');
                member.documentImageUrls.forEach((url) => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'document-item';
                    img.addEventListener('click', () => showImagePopup(url));
                    documentList.appendChild(img);
                });
            }
            
            // 상태 정보
            document.getElementById('memberIsActive').textContent = member.isActive ? '활성' : '비활성';
            
            // isApproved 토글 버튼 설정
            const approvedToggle = document.getElementById('memberApprovedToggle');
            const toggleText = document.getElementById('toggleText');
            approvedToggle.checked = member.isApproved || false;
            toggleText.textContent = approvedToggle.checked ? '승인됨' : '대기중';
            
            // 승인 대기 사유 표시
            const approvalReasonInput = document.getElementById('approvalReason');
            if (member.approvalReason) {
                approvalReasonInput.value = member.approvalReason;
            }
            
            // 승인 대기 사유 저장 버튼 이벤트
            document.getElementById('saveReasonBtn').addEventListener('click', async () => {
                try {
                    await db.collection('tripfriends_users').doc(memberId).update({
                        approvalReason: approvalReasonInput.value
                    });
                    alert('승인 대기 사유가 저장되었습니다.');
                } catch (error) {
                    console.error('승인 대기 사유 저장 에러:', error);
                    alert('승인 대기 사유 저장에 실패했습니다.');
                }
            });
            
            approvedToggle.addEventListener('change', async () => {
                try {
                    await db.collection('tripfriends_users').doc(memberId).update({
                        isApproved: approvedToggle.checked
                    });
                    toggleText.textContent = approvedToggle.checked ? '승인됨' : '대기중';
                    alert('승인 상태가 변경되었습니다.');
                } catch (error) {
                    console.error('승인 상태 변경 에러:', error);
                    alert('승인 상태 변경에 실패했습니다.');
                    approvedToggle.checked = !approvedToggle.checked;
                    toggleText.textContent = approvedToggle.checked ? '승인됨' : '대기중';
                }
            });
            
            document.getElementById('memberCreatedAt').textContent = formatDate(member.createdAt);
            document.getElementById('memberUpdatedAt').textContent = formatDate(member.updatedAt);
            document.getElementById('memberTokenUpdatedAt').textContent = formatDate(member.tokenUpdatedAt);
            
            // 약관 동의
            if (member.termsAgreed) {
                document.getElementById('memberTermsService').textContent = member.termsAgreed.service ? '동의' : '미동의';
                document.getElementById('memberTermsPrivacy').textContent = member.termsAgreed.privacy ? '동의' : '미동의';
                document.getElementById('memberTermsLocation').textContent = member.termsAgreed.location ? '동의' : '미동의';
                document.getElementById('memberTermsAgreedAt').textContent = formatDate(member.termsAgreed.agreedAt);
            }
            
            // 버튼 이벤트 설정
            setupButtonEvents();
        } else {
            alert('회원 정보를 찾을 수 없습니다.');
            history.back();
        }
    } catch (error) {
        console.error('회원 정보 로드 에러:', error);
        alert('회원 정보를 불러오는데 실패했습니다.');
    }
}

// 버튼 이벤트 설정
function setupButtonEvents() {
    // 수정 버튼
    document.getElementById('editBtn').addEventListener('click', () => {
        alert('수정 기능은 준비중입니다.');
    });    
    // setupButtonEvents 함수 내 삭제 버튼 부분 수정
    // 삭제 버튼
    document.getElementById('deleteBtn').addEventListener('click', async () => {
        // member 객체는 loadMemberDetail 함수에서 가져온 데이터 사용
        const memberName = document.getElementById('memberName').textContent;
        await confirmAndDeleteTripfriendsUser(memberId, memberName);
    });
}

// 헬퍼 함수들
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

function formatBirthDate(birthDate) {
    if (!birthDate) return '-';
    return `${birthDate.year || '-'}년 ${birthDate.month || '-'}월 ${birthDate.day || '-'}일`;
}

function formatPhone(phoneData) {
    if (!phoneData) return '-';
    return `${phoneData.countryCode || ''} ${phoneData.number || ''}`;
}

async function formatLocation(location) {
    if (!location) return '-';
    
    try {
        // 국가 정보 로드
        const countryResponse = await fetch('/data/country.json');
        const countryData = await countryResponse.json();
        const country = countryData.countries.find(c => c.code === location.nationality);
        const countryName = country ? country.name : location.nationality;
        
        // 도시 정보 로드
        let cityName = location.city;
        if (location.nationality) {
            try {
                const cityResponse = await fetch(`/data/city/${location.nationality}.json`);
                const cityData = await cityResponse.json();
                const city = cityData.cities.find(c => c.code === location.city);
                cityName = city ? city.name : location.city;
            } catch (error) {
                console.log('도시 파일 로드 실패:', error);
            }
        }
        
        // 나라, 도시 순서로 반환
        return `${countryName || '-'}, ${cityName || '-'}`;
    } catch (error) {
        console.error('위치 정보 로드 에러:', error);
        return `${location.nationality || '-'}, ${location.city || '-'}`;
    }
}

function formatLanguages(languages) {
    if (!languages || languages.length === 0) return '-';
    const langMap = {
        'korean': '한국어',
        'english': '영어',
        'vietnamese': '베트남어'
    };
    return languages.map(lang => langMap[lang] || lang).join(', ');
}

function formatPrice(price, symbol) {
    if (!price) return '-';
    return `${symbol || ''}${price.toLocaleString()}`;
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR');
}

// 이미지 팝업 표시
function showImagePopup(imageUrl) {
    const popup = document.createElement('div');
    popup.className = 'image-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <img src="${imageUrl}" alt="확대 이미지">
            <span class="close-popup">&times;</span>
        </div>
    `;
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup || e.target.className === 'close-popup') {
            popup.remove();
        }
    });
    
    document.body.appendChild(popup);
}