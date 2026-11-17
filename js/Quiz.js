// 1. KHAI BÁO DỮ LIỆU VÀ BIẾN
const ELEMENTS_URL = "../data/118NguyenTo.json";
const CLASSIFICATION_URL = "../data/PhanLoai.json";
const QUESTION_BANK_URL = "../data/NganHangCauHoi.json";
// Các nguyên tố phổ biến được sử dụng để sinh câu hỏi
const COMMON_ELEMENTS = [
    "H", "He", "C", "N", "O", "F", "Ne",
    "Na", "Mg", "Al", "Si", "P", "S", "Cl",
    "K", "Ca", "Fe", "Cu", "Zn", "Ag", "Au"
];
let questionBank = [];
let currentCards = [];
let currentIndex = 0;
let rememberedCards = [];
let forgottenCards = [];

// 2. CÁC HÀM HỖ TRỢ
// Trộn ngẫu nhiên một mảng
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
// Lấy dữ liệu và kiểm tra phản hồi
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không thể tải dữ liệu: ${url}`);
    return response.json();
}
// Kiểm tra dữ liệu có tồn tại hay không
function hasValue(value) {
    return value !== null &&
           value !== undefined &&
           String(value).trim() !== "";
}

// 3. SINH CÂU HỎI TỪ DỮ LIỆU NGUYÊN TỐ
function generateElementQuestions(elements, classifications) {
    const generatedQuestions = [];
    const commonList = elements.filter(element => COMMON_ELEMENTS.includes(element.kiHieu));
    commonList.forEach(element => {
        const symbol = element.kiHieu;
        const name = element.ten;        
        // Câu hỏi về số hiệu nguyên tử
        if (hasValue(element.soNT)) {
            generatedQuestions.push({
                id: `NT_${symbol}_SO`,
                chuDe: "element",
                nguyenTo: symbol,
                cauHoi: `Nguyên tố ${name} (${symbol}) có số hiệu nguyên tử là bao nhiêu?`,
                dapAn: String(element.soNT),
                giaiThich: `Số hiệu nguyên tử của ${name} (${symbol}) là ${element.soNT}. Đây cũng là số proton trong hạt nhân nguyên tử.`
            });
        }        
        // Câu hỏi về nguyên tử khối
        if (hasValue(element.ntKhoi)) {
            generatedQuestions.push({
                id: `NT_${symbol}_KHOI`,
                chuDe: "element",
                nguyenTo: symbol,
                cauHoi: `Nguyên tử khối của nguyên tố ${name} (${symbol}) xấp xỉ bao nhiêu?`,
                dapAn: String(element.ntKhoi) + " u",
                giaiThich: `Nguyên tử khối của ${name} (${symbol}) là ${element.ntKhoi} u.`
            });
        }        
        // Câu hỏi về kí hiệu hóa học
        if (hasValue(symbol)) {
            generatedQuestions.push({
                id: `NT_${symbol}_KIHIEU`,
                chuDe: "element",
                nguyenTo: symbol,
                cauHoi: `Kí hiệu hóa học của nguyên tố ${name} là gì?`,
                dapAn: symbol,
                giaiThich: `${name} có kí hiệu hóa học là ${symbol}.`
            });
        }        
        // Câu hỏi về nhóm
        if (hasValue(element.nhom)) {
            generatedQuestions.push({
                id: `NT_${symbol}_NHOM`,
                chuDe: "periodic",
                nguyenTo: symbol,
                cauHoi: `Nguyên tố ${name} (${symbol}) thuộc nhóm nào trong bảng tuần hoàn?`,
                dapAn: `Nhóm ${element.nhom}`,
                giaiThich: `${name} thuộc nhóm ${element.nhom} trong bảng tuần hoàn.`
            });
        }        
        // Câu hỏi về chu kì
        if (hasValue(element.chuKy)) {
            generatedQuestions.push({
                id: `NT_${symbol}_CHUKY`,
                chuDe: "periodic",
                nguyenTo: symbol,
                cauHoi: `Nguyên tố ${name} (${symbol}) nằm ở chu kì mấy?`,
                dapAn: `Chu kì ${element.chuKy}`,
                giaiThich: `${name} nằm ở chu kì ${element.chuKy}. Điều này cho biết nguyên tử có ${element.chuKy} lớp electron.`
            });
        }        
        // Câu hỏi về loại nguyên tố
        if (
            hasValue(element.loai) &&
            classifications[element.loai]
        ) {
            const category = classifications[element.loai];
            generatedQuestions.push({
                id: `NT_${symbol}_LOAI`,
                chuDe: "periodic",
                nguyenTo: symbol,
                cauHoi: `Nguyên tố ${name} (${symbol}) thuộc loại nguyên tố nào?`,
                dapAn: category,
                giaiThich: `${name} (${symbol}) được xếp vào nhóm ${category.toLowerCase()}.`
            });
        }        
        // Câu hỏi về trạng thái
        if (hasValue(element.trangThai)) {
            generatedQuestions.push({
                id: `NT_${symbol}_TRANGTHAI`,
                chuDe: "element",
                nguyenTo: symbol,
                cauHoi: `Ở điều kiện thường, nguyên tố ${name} (${symbol}) tồn tại ở trạng thái nào?`,
                dapAn: String(element.trangThai),
                giaiThich: `Ở điều kiện thường, ${name} tồn tại ở trạng thái ${element.trangThai}.`
            });
        }
    });
    return generatedQuestions;
}

// 4. TẠO NGÂN HÀNG CÂU HỎI
async function loadQuestionBank() {
    try {
        const [elements, classificationsData, manualQuestions] =
            await Promise.all([
                fetchJSON(ELEMENTS_URL),
                fetchJSON(CLASSIFICATION_URL),
                fetchJSON(QUESTION_BANK_URL)
            ]);
        // PhanLoai.json có cấu trúc là mảng gồm một đối tượng
        const classifications = classificationsData[0];
        // Sinh câu hỏi từ dữ liệu nguyên tố
        const generatedQuestions = generateElementQuestions(elements, classifications);
        // Kết hợp câu hỏi tự sinh và câu hỏi có sẵn
        questionBank = [...generatedQuestions, ...manualQuestions];
        console.log("Đã tải ngân hàng câu hỏi:", questionBank.length);
    } catch (error) {
        console.error("Lỗi tải ngân hàng câu hỏi:", error);
        alert(
            "Không thể tải dữ liệu ôn tập. " +
            "Hãy kiểm tra lại các file JSON và đường dẫn."
        );
    }
}

// 5. CHỌN 10 THẺ NGẪU NHIÊN
function selectRandomCards(topic = "all") {
    let availableCards = questionBank.filter(card => {
        return topic === "all" || card.chuDe === topic;
    });
    if (availableCards.length < 10) {
        alert(
            `Chủ đề này hiện chỉ có ${availableCards.length} thẻ. ` +
            "Vui lòng chọn Tất cả chủ đề."
        );
        return null;
    }
    // Trộn câu hỏi
    availableCards = shuffleArray(availableCards);
    // Ưu tiên mỗi nguyên tố chỉ xuất hiện một lần
    const selectedCards = [];
    const usedElements = new Set();
    for (const card of availableCards) {
        if (card.nguyenTo) {
            if (usedElements.has(card.nguyenTo)) continue;
            usedElements.add(card.nguyenTo);
        }
        selectedCards.push(card);
        if (selectedCards.length === 10) break;
    }
    // Nếu chưa đủ 10 thẻ, lấy thêm các thẻ còn lại
    if (selectedCards.length < 10) {
        const selectedIds = new Set(selectedCards.map(card => card.id));
        const remainingCards = availableCards.filter(card => !selectedIds.has(card.id));
        const additionalCards = shuffleArray(remainingCards);
        while (
            selectedCards.length < 10 &&
            additionalCards.length > 0
        ) {
            selectedCards.push(additionalCards.pop());
        }
    }
    return shuffleArray(selectedCards);
}

// 6. BẮT ĐẦU LƯỢT ÔN TẬP
function startQuiz() {
    const topic = document.getElementById("topicSelect").value;
    const selectedCards = selectRandomCards(topic);
    if (!selectedCards) return;
    currentCards = selectedCards;
    currentIndex = 0;
    rememberedCards = [];
    forgottenCards = [];
    document.getElementById("quizSetup").hidden = true;
    document.getElementById("quizResult").hidden = true;
    document.getElementById("flashcardArea").hidden = false;
    showCurrentCard();
}

// 7. HIỂN THỊ THẺ HIỆN TẠI
function showCurrentCard() {
    if (currentIndex >= currentCards.length) {
        showResult();
        return;
    }
    const card = currentCards[currentIndex];
    const flashcard = document.getElementById("flashcard");
    // Đưa thẻ về mặt câu hỏi
    flashcard.classList.remove("is-flipped");
    // Hiển thị câu hỏi và đáp án
    document.getElementById("cardQuestion").textContent = card.cauHoi;
    document.getElementById("cardAnswer").textContent = card.dapAn;
    document.getElementById("cardExplanation").textContent = card.giaiThich || "";
    // Cập nhật số thứ tự
    document.getElementById("cardCounter").textContent = `Thẻ ${currentIndex + 1}/${currentCards.length}`;
    // Cập nhật thanh tiến độ
    const progress = (currentIndex / currentCards.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    // Ẩn các nút đánh giá và chuyển thẻ
    document.getElementById("cardActions").hidden = true;
    document.getElementById("nextCardButton").hidden = true;
}

// 8. LẬT THẺ
function flipCard() {
    const flashcard = document.getElementById("flashcard");
    // Chỉ cho phép lật một lần trong mỗi thẻ
    if (flashcard.classList.contains("is-flipped")) return;
    flashcard.classList.add("is-flipped");
    // Hiện nút đánh giá sau khi lật
    document.getElementById("cardActions").hidden = false;
}

// 9. ĐÁNH DẤU ĐÃ NHỚ / CHƯA NHỚ
function markCard(isRemembered) {
    const card = currentCards[currentIndex];
    if (isRemembered) {
        rememberedCards.push(card);
    } else {
        forgottenCards.push(card);
    }
    // Ẩn các nút đánh giá
    document.getElementById("cardActions").hidden = true;
    // Hiện nút chuyển thẻ
    const nextButton = document.getElementById("nextCardButton");
    nextButton.hidden = false;
    if (currentIndex === currentCards.length - 1) {
        nextButton.textContent = "Xem kết quả";
    } else {
        nextButton.textContent = "Thẻ tiếp theo";
    }
}

// 10. CHUYỂN SANG THẺ TIẾP THEO
function nextCard() {
    currentIndex++;
    if (currentIndex >= currentCards.length) {
        showResult();
    } else {
        showCurrentCard();
    }
}

// 11. HIỂN THỊ KẾT QUẢ
function showResult() {
    document.getElementById("flashcardArea").hidden = true;
    document.getElementById("quizResult").hidden = false;
    document.getElementById("rememberedCount").textContent = rememberedCards.length;
    document.getElementById("forgotCount").textContent = forgottenCards.length;
    const message = document.getElementById("resultMessage");
    if (forgottenCards.length === 0) {
        message.textContent = "Tuyệt vời! Bạn đã nhớ tất cả 10 thẻ.";
    } else if (rememberedCards.length >= 7) {
        message.textContent = "Làm tốt lắm! Hãy tiếp tục ôn luyện những kiến thức còn chưa nhớ nhé.";
    } else {
        message.textContent = "Đừng lo! Hãy ôn lại những thẻ chưa nhớ để ghi nhớ kiến thức tốt hơn.";
    }
    // Chỉ hiện nút ôn lại nếu còn thẻ chưa nhớ
    document.getElementById("reviewButton").hidden = forgottenCards.length === 0;
    // Đưa thanh tiến độ về 100%
    document.getElementById("progressFill").style.width = "100%";
}

// 12. ÔN LẠI CÁC THẺ CHƯA NHỚ
function reviewForgottenCards() {
    if (forgottenCards.length === 0) return;
    currentCards = shuffleArray(forgottenCards);
    currentIndex = 0;
    // Xóa kết quả của lượt trước
    rememberedCards = [];
    forgottenCards = [];
    document.getElementById("quizResult").hidden = true;
    document.getElementById("flashcardArea").hidden = false;
    showCurrentCard();
}

// 13. BẮT ĐẦU LƯỢT MỚI
function restartQuiz() {
    document.getElementById("quizResult").hidden = true;
    document.getElementById("flashcardArea").hidden = true;
    document.getElementById("quizSetup").hidden = false;
    // Xóa dữ liệu lượt trước
    currentCards = [];
    rememberedCards = [];
    forgottenCards = [];
    currentIndex = 0;
}

// 14. GẮN SỰ KIỆN CHO CÁC NÚT
document.addEventListener("DOMContentLoaded", async function () {
    // Tải ngân hàng câu hỏi trước
    await loadQuestionBank();
    if (questionBank.length === 0) {
        document.getElementById("startQuiz").disabled = true;
        return;
    }
    // Bắt đầu
    document.getElementById("startQuiz").addEventListener("click", startQuiz);
    // Lật thẻ
    document.getElementById("flashcard").addEventListener("click", flipCard);
    // Chưa nhớ
    document.getElementById("forgotButton").addEventListener("click",
        function () {
            markCard(false);
        }
    );
    // Đã nhớ
    document.getElementById("rememberedButton").addEventListener("click",
        function () {
            markCard(true);
        }
    );
    // Thẻ tiếp theo
    document.getElementById("nextCardButton").addEventListener("click", nextCard);
    // Ôn lại thẻ chưa nhớ
    document.getElementById("reviewButton").addEventListener("click", reviewForgottenCards);
    // Lượt mới
    document.getElementById("restartButton").addEventListener("click", restartQuiz);
});