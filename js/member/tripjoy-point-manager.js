// tripjoy-point-manager.js
// 트립조이 회원 포인트 관리 기능

// 포인트 수정 모달 생성
function createPointModal() {
    const modalHtml = `
        <div id="pointModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>포인트 수정</h2>
                    <span class="close" onclick="closePointModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="point-info">
                        <p>현재 포인트: <span id="currentPoints">0</span></p>
                    </div>
                    <div class="point-actions">
                        <div class="action-group">
                            <input type="radio" id="addPoints" name="pointAction" value="add" checked>
                            <label for="addPoints">포인트 추가</label>
                        </div>
                        <div class="action-group">
                            <input type="radio" id="subtractPoints" name="pointAction" value="subtract">
                            <label for="subtractPoints">포인트 차감</label>
                        </div>
                    </div>
                    <div class="point-input">
                        <label for="pointAmount">금액:</label>
                        <input type="number" id="pointAmount" min="0" placeholder="포인트 입력">
                    </div>
                    <div class="point-reason">
                        <label for="pointReason">사유:</label>
                        <textarea id="pointReason" rows="3" placeholder="포인트 변경 사유를 입력하세요"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" onclick="closePointModal()">취소</button>
                    <button class="btn-confirm" onclick="confirmPointChange()">확인</button>
                </div>
            </div>
        </div>
    `;
    
    // 모달 스타일 추가
    const modalStyle = `
        <style>
        .modal {
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        }
        
        .modal-content {
            background-color: #fefefe;
            margin: 15% auto;
            padding: 0;
            border: 1px solid #888;
            width: 400px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }
        
        .close {
            font-size: 28px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }
        
        .close:hover {
            color: black;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .point-info {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .point-info p {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .point-actions {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .action-group {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .point-input,
        .point-reason {
            margin-bottom: 15px;
        }
        
        .point-input label,
        .point-reason label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #666;
        }
        
        .point-input input,
        .point-reason textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .btn-cancel,
        .btn-confirm {
            padding: 8px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-cancel {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-cancel:hover {
            background-color: #5a6268;
        }
        
        .btn-confirm {
            background-color: #4285f4;
            color: white;
        }
        
        .btn-confirm:hover {
            background-color: #357ae8;
        }
        
        .point-edit-btn {
            padding: 5px 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-left: 10px;
        }
        
        .point-edit-btn:hover {
            background-color: #218838;
        }
        </style>
    `;
    
    // DOM에 추가
    document.body.insertAdjacentHTML('beforeend', modalStyle + modalHtml);
}

// 포인트 수정 버튼 추가 (상세 페이지에 추가)
function addPointEditButton(currentPoints) {
    const pointElement = document.getElementById('memberPoints');
    if (pointElement) {
        const buttonHtml = `<button class="point-edit-btn" onclick="openPointModal()">수정</button>`;
        pointElement.parentElement.insertAdjacentHTML('beforeend', buttonHtml);
        
        // 현재 포인트 값 저장
        window.currentMemberPoints = currentPoints || 0;
    }
}

// 포인트 모달 열기
function openPointModal() {
    const modal = document.getElementById('pointModal');
    if (!modal) {
        createPointModal();
    }
    
    // 현재 포인트 표시
    document.getElementById('currentPoints').textContent = window.currentMemberPoints || '0';
    document.getElementById('pointModal').style.display = 'block';
    
    // 입력 필드 초기화
    document.getElementById('pointAmount').value = '';
    document.getElementById('pointReason').value = '';
    document.querySelector('input[name="pointAction"][value="add"]').checked = true;
}

// 포인트 모달 닫기
function closePointModal() {
    document.getElementById('pointModal').style.display = 'none';
}

// 포인트 변경 확인
async function confirmPointChange() {
    const action = document.querySelector('input[name="pointAction"]:checked').value;
    const amount = parseInt(document.getElementById('pointAmount').value) || 0;
    const reason = document.getElementById('pointReason').value.trim();
    
    if (amount === 0) {
        alert('포인트 금액을 입력해주세요.');
        return;
    }
    
    if (!reason) {
        alert('변경 사유를 입력해주세요.');
        return;
    }
    
    try {
        // 현재 포인트 계산
        let newPoints = window.currentMemberPoints || 0;
        if (action === 'add') {
            newPoints += amount;
        } else {
            newPoints -= amount;
            if (newPoints < 0) {
                alert('포인트는 0 미만이 될 수 없습니다.');
                return;
            }
        }
        
        // URL에서 회원 ID 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('id');
        
        // Firestore 업데이트
        await db.collection('users').doc(memberId).update({
            points: newPoints,
            lastPointUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 포인트 변경 이력 저장 (선택사항)
        await db.collection('users').doc(memberId).collection('pointHistory').add({
            action: action,
            amount: amount,
            reason: reason,
            beforePoints: window.currentMemberPoints,
            afterPoints: newPoints,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        
        // UI 업데이트
        window.currentMemberPoints = newPoints;
        document.getElementById('memberPoints').textContent = newPoints;
        
        alert('포인트가 성공적으로 변경되었습니다.');
        closePointModal();
        
    } catch (error) {
        console.error('포인트 변경 에러:', error);
        alert('포인트 변경에 실패했습니다.');
    }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('pointModal');
    if (event.target === modal) {
        closePointModal();
    }
}

// Export functions for use in other files
window.addPointEditButton = addPointEditButton;
window.openPointModal = openPointModal;
window.closePointModal = closePointModal;
window.confirmPointChange = confirmPointChange;