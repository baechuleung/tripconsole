// 전역 변수
let selectedChatId = null;
let chatData = {};

// 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        // UID 검증
        if (user.uid !== ALLOWED_UID) {
            auth.signOut();
            window.location.href = '/login.html';
            return;
        }
        // 채팅 목록 로드
        loadChatList();
    } else {
        window.location.href = '/login.html';
    }
});

// 채팅 목록 로드 - 병렬 처리 버전
async function loadChatList() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '<div class="loading">채팅 목록을 불러오는 중...</div>';
    
    try {
        // Realtime Database에서 chat 아래의 모든 데이터 가져오기
        const chatRef = database.ref('chat');
        const snapshot = await chatRef.once('value');
        const chats = snapshot.val();
        
        if (!chats) {
            chatList.innerHTML = '<div class="no-data">채팅 데이터가 없습니다.</div>';
            return;
        }
        
        chatList.innerHTML = '';
        chatData = chats;
        
        // 모든 채팅 아이템을 병렬로 처리
        const chatPromises = Object.entries(chats).map(async ([chatId, data]) => {
            return createChatItem(chatId, data);
        });
        
        // 모든 프로미스가 완료될 때까지 대기
        const chatItems = await Promise.all(chatPromises);
        
        // 채팅 아이템들을 한번에 추가
        chatItems.forEach(chatItem => {
            chatList.appendChild(chatItem);
        });
        
    } catch (error) {
        console.error('채팅 목록 로드 에러:', error);
        chatList.innerHTML = '<div class="error">채팅 목록을 불러올 수 없습니다.</div>';
    }
}

// 채팅 아이템 생성
function createChatItem(chatId, data) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = chatId;
    
    // 메시지 수 계산
    const messageCount = data.messages ? Object.keys(data.messages).length : 0;
    
    div.innerHTML = `
        <div class="chat-item-id">${chatId}</div>
        <div class="chat-item-info">
            메시지: ${messageCount}개
        </div>
    `;
    
    div.addEventListener('click', () => selectChat(chatId));
    
    return div;
}

// 채팅 선택
function selectChat(chatId) {
    // 기존 선택 해제
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 새로운 선택
    document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('selected');
    selectedChatId = chatId;
    
    // 선택된 채팅 정보 표시
    showSelectedChat(chatId);
    
    // 복사 폼 표시
    document.getElementById('copyForm').style.display = 'block';
}

// 선택된 채팅 정보 표시
function showSelectedChat(chatId) {
    const selectedChatDiv = document.getElementById('selectedChat');
    const data = chatData[chatId];
    const messageCount = data.messages ? Object.keys(data.messages).length : 0;
    
    selectedChatDiv.className = 'selected-chat selected-info';
    selectedChatDiv.innerHTML = `
        <h4>선택된 채팅</h4>
        <p><strong>ID:</strong> ${chatId}</p>
        <p><strong>메시지 수:</strong> ${messageCount}개</p>
        ${data.info ? `<p><strong>정보:</strong> ${JSON.stringify(data.info)}</p>` : ''}
    `;
    
    // 새 채팅 ID 입력 필드 초기화
    document.getElementById('newChatId').value = '';
}

// 복사 취소
function cancelCopy() {
    selectedChatId = null;
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.getElementById('selectedChat').className = 'selected-chat';
    document.getElementById('selectedChat').innerHTML = '<p>복사할 채팅을 선택해주세요</p>';
    document.getElementById('copyForm').style.display = 'none';
}

// 복사 실행
async function executeCopy() {
    if (!selectedChatId) {
        alert('복사할 채팅을 선택해주세요.');
        return;
    }
    
    const newChatId = document.getElementById('newChatId').value.trim();
    const copyMessages = document.getElementById('copyMessages').checked;
    const copyInfo = document.getElementById('copyInfo').checked;
    
    // 유효성 검사
    if (!newChatId) {
        alert('새 채팅 ID를 입력해주세요.');
        return;
    }
    
    // ID 형식 검사
    if (!newChatId.includes('_')) {
        alert('채팅 ID는 userId_tripfriendsId 형식이어야 합니다.');
        return;
    }
    
    // 중복 검사
    if (chatData[newChatId]) {
        alert('이미 존재하는 채팅 ID입니다.');
        return;
    }
    
    const copyButton = document.getElementById('copyButton');
    copyButton.disabled = true;
    copyButton.textContent = '복사 중...';
    
    try {
        const sourceChatData = chatData[selectedChatId];
        const newChatData = {};
        
        // info 복사
        if (copyInfo && sourceChatData.info) {
            newChatData.info = { ...sourceChatData.info };
        }
        
        // messages 복사
        if (copyMessages && sourceChatData.messages) {
            newChatData.messages = {};
            
            // 각 메시지 복사
            Object.keys(sourceChatData.messages).forEach(messageId => {
                newChatData.messages[messageId] = {
                    ...sourceChatData.messages[messageId],
                    copiedAt: Date.now(),
                    copiedFrom: selectedChatId
                };
            });
        }
        
        // Realtime Database에 저장
        await database.ref(`chat/${newChatId}`).set(newChatData);
        
        alert(`채팅이 성공적으로 복사되었습니다!\n원본: ${selectedChatId}\n복사본: ${newChatId}`);
        
        // 목록 새로고침
        loadChatList();
        cancelCopy();
        
    } catch (error) {
        console.error('채팅 복사 에러:', error);
        alert('채팅 복사 중 오류가 발생했습니다.');
    } finally {
        copyButton.disabled = false;
        copyButton.textContent = '복사 실행';
    }
}

// 채팅 삭제
async function deleteChat() {
    if (!selectedChatId) {
        alert('삭제할 채팅을 선택해주세요.');
        return;
    }
    
    const messageCount = chatData[selectedChatId].messages ? Object.keys(chatData[selectedChatId].messages).length : 0;
    
    if (!confirm(`정말로 이 채팅을 삭제하시겠습니까?\n\n채팅 ID: ${selectedChatId}\n메시지 수: ${messageCount}개\n\n이 작업은 되돌릴 수 없습니다!`)) {
        return;
    }
    
    const deleteButton = document.querySelector('.btn-delete');
    deleteButton.disabled = true;
    deleteButton.textContent = '삭제 중...';
    
    try {
        // Realtime Database에서 삭제
        await database.ref(`chat/${selectedChatId}`).remove();
        
        alert('채팅이 성공적으로 삭제되었습니다.');
        
        // 목록 새로고침
        loadChatList();
        cancelCopy();
        
    } catch (error) {
        console.error('채팅 삭제 에러:', error);
        alert('채팅 삭제 중 오류가 발생했습니다.');
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = '삭제';
    }
}

// 전역 함수로 등록
window.selectChat = selectChat;
window.cancelCopy = cancelCopy;
window.executeCopy = executeCopy;
window.deleteChat = deleteChat;