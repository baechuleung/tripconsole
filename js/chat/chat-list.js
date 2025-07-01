// 전역 변수
let currentChatId = null;
let chatListener = null;
let messageListener = null;

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

// 채팅 목록 로드
async function loadChatList() {
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '<div class="loading">채팅 목록을 불러오는 중...</div>';
    
    try {
        // Realtime Database에서 채팅 목록 가져오기
        const chatRef = database.ref('chat');
        const snapshot = await chatRef.once('value');
        const chats = snapshot.val();
        
        if (!chats) {
            chatList.innerHTML = '<div class="no-chats">채팅 내역이 없습니다.</div>';
            return;
        }
        
        chatList.innerHTML = '';
        const chatArray = [];
        
        // 채팅 데이터 처리
        for (const chatId in chats) {
            const chatData = chats[chatId];
            const [userId, tripfriendsId] = chatId.split('_');
            
            // 사용자 정보 가져오기
            const userInfo = await getUserInfo(userId, tripfriendsId);
            
            // 마지막 메시지 정보 가져오기
            const lastMessage = await getLastMessage(chatId);
            
            chatArray.push({
                id: chatId,
                userId,
                tripfriendsId,
                userInfo,
                lastMessage,
                info: chatData.info
            });
        }
        
        // 최신 메시지 순으로 정렬
        chatArray.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp || 0;
            const timeB = b.lastMessage?.timestamp || 0;
            return timeB - timeA;
        });
        
        // 채팅 목록 표시
        chatArray.forEach(chat => {
            const chatItem = createChatItem(chat);
            chatList.appendChild(chatItem);
        });
        
    } catch (error) {
        console.error('채팅 목록 로드 에러:', error);
        chatList.innerHTML = '<div class="no-chats">채팅 목록을 불러올 수 없습니다.</div>';
    }
}

// 사용자 정보 가져오기
async function getUserInfo(userId, tripfriendsId) {
    try {
        // 트립조이 사용자 정보
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        // 트립프렌즈 정보
        const friendDoc = await db.collection('tripfriends_users').doc(tripfriendsId).get();
        const friendData = friendDoc.exists ? friendDoc.data() : {};
        
        return {
            userName: userData.name || userData.email || '알 수 없는 사용자',
            friendName: friendData.name || '알 수 없는 프렌즈'
        };
    } catch (error) {
        console.error('사용자 정보 로드 에러:', error);
        return {
            userName: '알 수 없는 사용자',
            friendName: '알 수 없는 프렌즈'
        };
    }
}

// 마지막 메시지 가져오기
async function getLastMessage(chatId) {
    try {
        const messagesRef = database.ref(`chat/${chatId}/messages`);
        const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(1).once('value');
        const messages = snapshot.val();
        
        if (messages) {
            const messageId = Object.keys(messages)[0];
            return messages[messageId];
        }
        
        return null;
    } catch (error) {
        console.error('마지막 메시지 로드 에러:', error);
        return null;
    }
}

// 채팅 아이템 생성
function createChatItem(chat) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.dataset.chatId = chat.id;
    
    const lastMessageTime = chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : '';
    const lastMessageContent = chat.lastMessage ? chat.lastMessage.content : '메시지가 없습니다';
    
    div.innerHTML = `
        <div class="chat-item-header">
            <span class="chat-item-name">${chat.userInfo.friendName}</span>
            <span class="chat-item-time">${lastMessageTime}</span>
        </div>
        <div class="chat-item-preview">
            ${chat.userInfo.userName}: ${lastMessageContent}
        </div>
    `;
    
    div.addEventListener('click', () => openChat(chat));
    
    return div;
}

// 채팅 열기
async function openChat(chat) {
    // 현재 선택된 채팅 표시
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat-id="${chat.id}"]`).classList.add('active');
    
    currentChatId = chat.id;
    
    // 채팅 상세 섹션 업데이트
    const detailSection = document.getElementById('chatDetailSection');
    detailSection.innerHTML = `
        <div class="chat-detail-header">
            <div class="chat-detail-info">
                <h3>${chat.userInfo.friendName}</h3>
                <p>${chat.userInfo.userName}과의 대화</p>
            </div>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="loading">메시지를 불러오는 중...</div>
        </div>
        <div class="chat-input-container">
            <input type="text" class="chat-input" id="messageInput" placeholder="메시지를 입력하세요..." disabled>
            <button class="btn-send" id="sendButton" disabled>전송</button>
        </div>
    `;
    
    // 메시지 로드 및 실시간 리스너 설정
    loadMessages(chat.id);
}

// 메시지 로드
function loadMessages(chatId) {
    // 기존 리스너 제거
    if (messageListener) {
        messageListener.off();
    }
    
    const messagesContainer = document.getElementById('chatMessages');
    const messagesRef = database.ref(`chat/${chatId}/messages`);
    
    // 실시간 메시지 리스너
    messageListener = messagesRef.orderByChild('timestamp');
    
    messageListener.on('value', (snapshot) => {
        messagesContainer.innerHTML = '';
        const messages = snapshot.val();
        
        if (!messages) {
            messagesContainer.innerHTML = '<div class="no-chats">메시지가 없습니다.</div>';
            return;
        }
        
        // 메시지를 배열로 변환하고 정렬
        const messageArray = Object.entries(messages).map(([id, data]) => ({
            id,
            ...data
        }));
        
        messageArray.sort((a, b) => a.timestamp - b.timestamp);
        
        // 메시지 표시
        messageArray.forEach(message => {
            const messageEl = createMessageElement(message);
            messagesContainer.appendChild(messageEl);
        });
        
        // 스크롤을 맨 아래로
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// 메시지 엘리먼트 생성
function createMessageElement(message) {
    const div = document.createElement('div');
    const isSent = message.senderId === ALLOWED_UID;
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const time = formatTime(message.timestamp);
    
    div.innerHTML = `
        <div class="message-content">
            ${message.content}
            <div class="message-info">${time}</div>
        </div>
    `;
    
    return div;
}

// 시간 포맷
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // 오늘인 경우
    if (date.toDateString() === now.toDateString()) {
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours || 12;
        return `${period} ${displayHours}:${minutes}`;
    }
    
    // 어제인 경우
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return '어제';
    }
    
    // 그 외
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
}

// 페이지 언로드 시 리스너 정리
window.addEventListener('beforeunload', () => {
    if (chatListener) {
        chatListener.off();
    }
    if (messageListener) {
        messageListener.off();
    }
});