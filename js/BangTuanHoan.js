import * as THREE from "https://esm.sh/three@0.170.0";
import { OrbitControls } from "https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js";

//1. ĐƯỜNG DẪN DỮ LIỆU
const ELEMENTS_URL = "data/118NguyenTo.json";
const CLASSIFICATION_URL = "data/PhanLoai.json";
const ELECTRON_URL = "data/PhanBoElectron.json";
const categoryClasses = {
    "KL-K": "KL-K",
    "KL-KT": "KL-KT",
    "KL-CT": "KL-CT",
    "KL-HCT": "KL-HCT",
    "AK": "AK",
    "PK": "PK",
    "Halo": "Halo",
    "KH": "KH",
    "La": "La",
    "Ac": "Ac"
};

// 2. LƯU TRỮ DỮ LIỆU
let elementsData = [];
let classificationData = {};
let electronDistributionData = {};
let currentElement = null;
let currentInfoCard = 0;
let imageSearchRequest = 0;

// 3. QUẢN LÝ MÔ HÌNH 3D
let atomRenderer = null;
let atomAnimationId = null;
let atomControls = null;
let atomResizeObserver = null;
let atomScene = null;

// 4. KIỂM TRA DỮ LIỆU ELECTRON
function validateElectronData(data) {
    if (!data || typeof data !== "object") {
        throw new Error("Dữ liệu phân bố electron không hợp lệ.");
    }
    for (let number = 1; number <= 118; number++) {
        const distribution = data[number];
        if (!Array.isArray(distribution)) throw new Error(`Thiếu dữ liệu electron của nguyên tố số ${number}.`);
        if (
            distribution.length === 0 ||
            distribution.length > 7 ||
            distribution.some(value => !Number.isInteger(value) || value < 0)
        ) throw new Error(`Dữ liệu electron của nguyên tố số ${number} không hợp lệ.`);  
        const totalElectrons = distribution.reduce((sum, value) => sum + value, 0);
        if (totalElectrons !== number) throw new Error( `Nguyên tố số ${number}: tổng electron là ` + `${totalElectrons}, không phải ${number}.`);
    }
    console.log("Dữ liệu electron của 118 nguyên tố hợp lệ.");
}

// 5. TẢI DỮ LIỆU JSON
async function loadPeriodicTableData() {
    try {
        const [elementsResponse, classificationResponse, electronResponse] 
        = await Promise.all([fetch(ELEMENTS_URL), fetch(CLASSIFICATION_URL), fetch(ELECTRON_URL)]);
        if (
            !elementsResponse.ok ||
            !classificationResponse.ok ||
            !electronResponse.ok
        ) throw new Error("Không thể tải một hoặc nhiều file JSON.");
        elementsData = await elementsResponse.json();
        const classificationArray = await classificationResponse.json();
        classificationData = classificationArray[0];
        electronDistributionData = await electronResponse.json();
        // Kiểm tra dữ liệu electron
        validateElectronData(electronDistributionData);
        // Kiểm tra dữ liệu nguyên tố
        if (!Array.isArray(elementsData) || elementsData.length !== 118) throw new Error("File 118NguyenTo.json không có đủ 118 nguyên tố.");
        renderPeriodicTable();
        renderLegend();
        // Lưu dữ liệu để tiện kiểm tra từ Console
        window.elementsData = elementsData;
        window.classificationData = classificationData;
        window.electronDistributionData = electronDistributionData;
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        const table = document.getElementById("periodicTable");
        if (table) {
            table.innerHTML = `
                <p class="no-result">
                    Không thể tải dữ liệu bảng tuần hoàn.
                    Vui lòng kiểm tra lại các file JSON.
                </p>
            `;
        }
    }
}

// 6. TẠO MỘT Ô NGUYÊN TỐ
function createElementCard(element) {
    const card = document.createElement("div");
    const categoryClass = categoryClasses[element.loai] || "";
    card.className = `element ${categoryClass}`;
    card.dataset.atomicNumber = element.soNT;
    card.dataset.symbol = element.kiHieu;
    card.dataset.name = element.ten;
    card.dataset.category = element.loai;
    card.innerHTML = `
        <span class="atomic-number">
            ${element.soNT}
        </span>
        <span class="symbol">
            ${element.kiHieu}
        </span>
        <span class="element-name">
            ${element.ten}
        </span>
        <span class="atomic-mass">
            ${element.ntKhoi ?? ""}
        </span>
    `;
    card.addEventListener("click", () => {showElementDetail(element);});
    return card;
}

// 7. TẠO BẢNG TUẦN HOÀN CHÍNH
function renderPeriodicTable() {
    const table = document.getElementById("periodicTable");
    if (!table) return;
    table.innerHTML = "";
    // Nhãn nhóm 1–18
    for (let group = 1; group <= 18; group++) {
        const label = document.createElement("div");
        label.className = "group-label";
        label.textContent = group;
        label.style.gridColumn = group + 1;
        label.style.gridRow = 1;
        table.appendChild(label);
    }
    // Nhãn chu kỳ 1–7
    for (let period = 1; period <= 7; period++) {
        const label = document.createElement("div");
        label.className = "period-label";
        label.textContent = period;
        label.style.gridColumn = 1;
        label.style.gridRow = period + 1;
        table.appendChild(label);
    }
    // Vị trí thay thế cho Lanthanide và Actinide
    createSeriesPlaceholder(table, 6, "57–71");
    createSeriesPlaceholder(table, 7, "89–103");
    elementsData.forEach(element => {
        if (
            (element.soNT >= 57 && element.soNT <= 71) ||
            (element.soNT >= 89 && element.soNT <= 103)
        ) return;
        const card = createElementCard(element);
        card.style.gridColumn = element.nhom + 1;
        card.style.gridRow = element.chuKy + 1;
        table.appendChild(card);
    });
    renderSpecialRows();
}

// 8. VỊ TRÍ THAY THẾ CHO HAI DÃY
function createSeriesPlaceholder(table, period, text) {
    const placeholder = document.createElement("div");
    placeholder.className = "series-placeholder";
    placeholder.textContent = text;
    placeholder.style.gridColumn = 4;
    placeholder.style.gridRow = period + 1;
    table.appendChild(placeholder);
}

// 9. HIỂN THỊ LANTHANIDE VÀ ACTINIDE
function renderSpecialRows() {
    const lanthanideRow = document.getElementById("lanthanideRow");
    const actinideRow = document.getElementById("actinideRow");
    if (!lanthanideRow || !actinideRow) return;
    lanthanideRow.innerHTML = "";
    actinideRow.innerHTML = "";
    const lanthanides = elementsData.filter(element => element.soNT >= 57 && element.soNT <= 71);
    const actinides = elementsData.filter(element => element.soNT >= 89 && element.soNT <= 103);
    lanthanides.forEach(element => {
        lanthanideRow.appendChild(createElementCard(element));
    });
    actinides.forEach(element => {
        actinideRow.appendChild(createElementCard(element));
    });
}

// 10. TẠO CHÚ GIẢI PHÂN LOẠI
function renderLegend() {
    const legend = document.getElementById("elementLegend");
    if (!legend) return;
    legend.innerHTML = "";
    Object.entries(classificationData).forEach(([code, name]) => {
        const item = document.createElement("div");
        item.className = "legend-item";
        const color = document.createElement("span");
        color.className = `legend-color ${categoryClasses[code] || ""}`;
        const label = document.createElement("span");
        label.textContent = name;
        item.appendChild(color);
        item.appendChild(label);
        legend.appendChild(item);
        }
    );
}

// 11. CAROUSEL THÔNG TIN NGUYÊN TỐ
const infoCardTitles = [
    "Thông tin bảng tuần hoàn",
    "Tính chất vật lý",
    "Ứng dụng",
    "Lịch sử"
];
function showInfoCard(index) {
    const track = document.getElementById("infoCarouselTrack");
    const title = document.getElementById("infoCardTitle");
    const dots = document.querySelectorAll(".info-dot");
    const totalCards = infoCardTitles.length;
    if (!track || !title) return;
    // Giới hạn chỉ số trong 4 thẻ
    currentInfoCard = (index + totalCards) % totalCards;
    // Mỗi thẻ chiếm 25% chiều rộng track
    track.style.transform = `translateX(-${currentInfoCard * 25}%)`;
    // Cập nhật tiêu đề
    title.textContent = infoCardTitles[currentInfoCard];
    // Cập nhật dấu chấm
    dots.forEach((dot, i) => {dot.classList.toggle(
        "active",
        i === currentInfoCard
    );
    });
}

// 12. TẠO CÁC DÒNG THÔNG TIN
function createInfoItems(container, fields, clear = true) {
    if (!container) return;
    // Xóa nội dung cũ để tránh bị lặp
    if (clear) container.innerHTML = "";
    const info = document.createElement("div");
    info.className = "detail-info";
    fields.forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "detail-item";
        const fieldLabel = document.createElement("span");
        fieldLabel.className = "detail-label";
        fieldLabel.textContent = label;
        const fieldValue = document.createElement("strong");
        fieldValue.className = "detail-value";
        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            fieldValue.textContent = Array.isArray(value)
                ? value.join(", ")
                : String(value);
        } else {
            fieldValue.textContent = "Chưa có dữ liệu";
        }
        item.appendChild(fieldLabel);
        item.appendChild(fieldValue);
        info.appendChild(item);
    });
    container.appendChild(info);
}

// CẤU HÌNH ELECTRON THEO PHÂN LỚP ORBITAL
// Thứ tự điền electron theo quy tắc Aufbau
const ORBITAL_ORDER = [
    ["1s", 2],
    ["2s", 2],
    ["2p", 6],
    ["3s", 2],
    ["3p", 6],
    ["4s", 2],
    ["3d", 10],
    ["4p", 6],
    ["5s", 2],
    ["4d", 10],
    ["5p", 6],
    ["6s", 2],
    ["4f", 14],
    ["5d", 10],
    ["6p", 6],
    ["7s", 2],
    ["5f", 14],
    ["6d", 10],
    ["7p", 6]
];
// Các nguyên tố có cấu hình electron ngoại lệ.
// // Mỗi giá trị là số electron cuối cùng của phân lớp được chỉ định.
const ELECTRON_EXCEPTIONS = {
    24: { "4s": 1, "3d": 5 },       // Cr - Chromium
    29: { "4s": 1, "3d": 10 },      // Cu - Copper

    41: { "5s": 1, "4d": 4 },       // Nb - Niobium
    42: { "5s": 1, "4d": 5 },       // Mo - Molybdenum
    44: { "5s": 1, "4d": 7 },       // Ru - Ruthenium
    45: { "5s": 1, "4d": 8 },       // Rh - Rhodium
    46: { "5s": 0, "4d": 10 },      // Pd - Palladium
    47: { "5s": 1, "4d": 10 },      // Ag - Silver

    57: { "4f": 0, "5d": 1 },       // La - Lanthanum
    58: { "4f": 1, "5d": 1 },       // Ce - Cerium
    64: { "4f": 7, "5d": 1 },       // Gd - Gadolinium

    78: { "6s": 1, "5d": 9 },       // Pt - Platinum
    79: { "6s": 1, "5d": 10 },      // Au - Gold

    89: { "5f": 0, "6d": 1 },       // Ac - Actinium
    90: { "5f": 0, "6d": 2 },       // Th - Thorium
    91: { "5f": 2, "6d": 1 },       // Pa - Protactinium
    92: { "5f": 3, "6d": 1 },       // U  - Uranium
    93: { "5f": 4, "6d": 1 },       // Np - Neptunium
    96: { "5f": 7, "6d": 1 },       // Cm - Curium

    // Cấu hình trạng thái cơ bản hiện đại thường được chấp nhận
    103: { "6d": 0, "7p": 1 }       // Lr - Lawrencium
};
// Tính cấu hình electron đầy đủ từ số hiệu nguyên tử
function getElectronConfiguration(atomicNumber) {
    const Z = Number(atomicNumber);
    if (!Number.isInteger(Z) || Z < 1 || Z > 118) return [];
    const configuration = {};
    let remaining = Z;
    // Tính theo quy tắc Aufbau trước
    for (const [orbital, capacity] of ORBITAL_ORDER) {
        if (remaining <= 0) break;
        const electrons = Math.min(remaining, capacity);
        configuration[orbital] = electrons;
        remaining -= electrons;
    }
    // Ghi đè các phân lớp có cấu hình ngoại lệ
    const exception = ELECTRON_EXCEPTIONS[Z];
    if (exception) Object.assign(configuration, exception);
    // Trả về theo thứ tự orbital đã quy định
    return ORBITAL_ORDER
        .filter(([orbital]) => (configuration[orbital] || 0) > 0)
        .map(([orbital]) => ({
            orbital,
            electrons: configuration[orbital]
        }));
}
// Tạo ô hiển thị cấu hình electron
function createElectronConfiguration(container, element) {
    if (!container || !element) return;
    const configuration = getElectronConfiguration(element.soNT);
    if (!configuration.length) return;
    const configBox = document.createElement("div");
    configBox.id = "electronConfigItem";
    configBox.className = "electron-config-item";
    const title = document.createElement("div");
    title.className = "electron-config-title";
    title.textContent = "Cấu hình electron";
    const value = document.createElement("div");
    value.className = "electron-config-value";
    configuration.forEach((item, index) => {
        const orbital = document.createElement("span");
        orbital.className = "electron-orbital";
        const name = document.createElement("span");
        name.textContent = item.orbital;
        const superscript = document.createElement("sup");
        superscript.textContent = item.electrons;
        orbital.append(name, superscript);
        value.appendChild(orbital);
        if (index < configuration.length - 1) value.appendChild(document.createTextNode(" "));
    });
    configBox.append(title, value);
    container.appendChild(configBox);
}

// 13. TẠO NỘI DUNG VĂN BẢN
function createInfoText(container, heading, content) {
    if (!container) return;
    container.innerHTML = "";
    container.classList.add("info-content");
    const title = document.createElement("h3");
    title.textContent = heading;
    const paragraph = document.createElement("p");
    paragraph.textContent =
        content || "Chưa có thông tin.";
    container.appendChild(title);
    container.appendChild(paragraph);
}

// TẠO KHUNG ỨNG DỤNG / FACT / CẢNH BÁO
function createApplicationBox(
    container,
    type,
    icon,
    heading,
    content
) {
    if (!container) return;
    const box = document.createElement("div");
    box.className = `application-box ${type}`;
    const header = document.createElement("div");
    header.className = "application-box-header";
    const iconElement = document.createElement("span");
    iconElement.className = "application-box-icon";
    iconElement.textContent = icon;
    const title = document.createElement("span");
    title.textContent = heading;
    header.appendChild(iconElement);
    header.appendChild(title);
    const paragraph = document.createElement("p");
    paragraph.className = "application-box-content";
    paragraph.textContent =
        content || "Chưa có thông tin.";
    box.appendChild(header);
    box.appendChild(paragraph);
    container.appendChild(box);
}
// 14. HIỂN THỊ THÔNG TIN NGUYÊN TỐ
function showElementDetail(element) {
    const modal = document.getElementById("elementModal");
    if (!modal) return;
    currentElement = element;
    const categoryName = classificationData[element.loai] || "Chưa phân loại";
    // THẺ 1: THÔNG TIN BẢNG TUẦN HOÀN
    const periodicInfo = document.getElementById("periodicInfo");
    if (periodicInfo) {
        periodicInfo.innerHTML = "";
        periodicInfo.classList.add("info-content");
        // Phần đầu thẻ
        const header = document.createElement("div");
        header.className = "detail-header";
        const symbol = document.createElement("div");
        // Gán màu theo loại nguyên tố
        symbol.className = `detail-symbol ${element.loai || ""}`;
        symbol.textContent = element.kiHieu;
        const heading = document.createElement("div");
        heading.className = "detail-heading";
        const name = document.createElement("h3");
        name.textContent = element.ten;
        const subtitle = document.createElement("p");
        subtitle.textContent = `Nguyên tố số ${element.soNT}`;
        heading.appendChild(name);
        heading.appendChild(subtitle);
        header.appendChild(symbol);
        header.appendChild(heading);
        periodicInfo.appendChild(header);
        // Lấy số lớp electron
        const electronShells = calculateElectronShells(element.soNT);
        createInfoItems(periodicInfo, [
            ["Số hiệu nguyên tử", element.soNT],
            ["Ký hiệu hóa học", element.kiHieu],
            ["Tên nguyên tố", element.ten],
            ["Nguyên tử khối", element.ntKhoi],
            ["Nhóm", element.nhom],
            ["Chu kỳ", element.chuKy],
            ["Phân loại", categoryName],
            ["Số lớp electron", electronShells.length]
        ], false);
        const periodicGrid =
            periodicInfo.querySelector(".detail-info");
        createElectronConfiguration(periodicGrid, element);
    }
    // THẺ 2: TÍNH CHẤT VẬT LÝ
    const physicalInfo = document.getElementById("physicalInfo");
    createInfoItems(physicalInfo, [
        ["Trạng thái", element.trangThai],
        ["Màu sắc", element.mauSac],
        ["Khối lượng riêng", element.khoiLuongRieng],
        ["Nhiệt độ nóng chảy", element.nhietDoNongChay],
        ["Nhiệt độ sôi", element.nhietDoSoi]
    ]);
    physicalInfo?.classList.add("info-content");
    // THẺ 3: ỨNG DỤNG
    const applicationInfo = document.getElementById("applicationInfo");
    const applicationContent = document.getElementById("applicationContent");
    const factContent = document.getElementById("factContent");
    const warningContent = document.getElementById("warningContent");
    if (applicationContent) applicationContent.innerHTML = "";
    if (factContent) factContent.innerHTML = "";
    if (warningContent) warningContent.innerHTML = "";
    applicationInfo?.classList.add("info-content");
    createApplicationBox(
        applicationContent,
        "real-use",
        "💡",
        "Ứng dụng thực tế",
        element.ungDung
    );
    createApplicationBox(
        factContent,
        "fact",
        "✨",
        "Bạn có biết?",
        element.moTa
    );
    createApplicationBox(
        warningContent,
        "warning",
        "⚠️",
        "Cảnh báo / Nguy cơ",
        element.canhBao
    );
    // THẺ 4: LỊCH SỬ
    const historyInfo = document.getElementById("historyInfo");
    if (historyInfo) {
        historyInfo.innerHTML = "";
        historyInfo.classList.add("info-content");
        const title = document.createElement("h3");
        title.textContent = `Lịch sử của ${element.ten}`;
        historyInfo.appendChild(title);
        createInfoItems(historyInfo, [
            ["Người phát hiện", element.nguoiPhatHien],
            ["Năm phát hiện", element.namPhatHien],
            ["Nguồn gốc tên gọi", element.nguonGocTen]
        ], false);
        const description = document.createElement("p");
        description.className = "history-description";
        description.textContent =
            element.lichSuPhatHien ||
            "Chưa có thông tin lịch sử.";
        historyInfo.appendChild(description);
    }
    // ĐƯA CAROUSEL VỀ THẺ ĐẦU TIÊN
    showInfoCard(0);
    // MỞ MODAL
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // TẢI ẢNH THỰC TẾ
    loadElementImage(element);
    // DỰNG MÔ HÌNH NẾU TAB 3D ĐANG MỞ
    const atomPanel = document.getElementById("atomPanel");
    if (atomPanel?.classList.contains("active")) {
        setTimeout(() => {
            if (currentElement === element) {
                createAtomModel(element);
            }
        }, 50);
    }
}

// 15. ĐÓNG MODAL
function closeElementModal() {
    const modal = document.getElementById("elementModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // Hủy yêu cầu tìm ảnh cũ
    imageSearchRequest++;
    // Dọn dẹp mô hình 3D
    cleanupAtomModel();
}

// 16. SỰ KIỆN MODAL
function setupModalEvents() {
    const closeButton = document.getElementById("closeElementModal");
    const overlay = document.getElementById("modalOverlay");
    closeButton?.addEventListener("click", closeElementModal);
    overlay?.addEventListener("click", closeElementModal);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeElementModal();
    });
}

// 17. SỰ KIỆN CAROUSEL
function setupInfoCarousel() {
    const previousButton = document.getElementById("prevInfoCard");
    const nextButton = document.getElementById("nextInfoCard");
    const dots = document.querySelectorAll(".info-dot");
    previousButton?.addEventListener("click", () => {
        showInfoCard(currentInfoCard - 1);
    });
    nextButton?.addEventListener("click", () => {
        showInfoCard(currentInfoCard + 1);
    });
    dots.forEach(dot => {
        dot.addEventListener("click", () => {
            const index = Number(dot.dataset.index);
            if (Number.isInteger(index)) showInfoCard(index);
        });
    });
}

// 18. CHUYỂN ĐỔI TAB ẢNH VÀ MÔ HÌNH 3D
function setupVisualTabs() {
    const tabs = document.querySelectorAll(".visual-tab");
    const panels = document.querySelectorAll(".visual-panel");
    tabs.forEach(tab => {tab.addEventListener("click", () => {
        // Bỏ trạng thái active của tất cả tab
        tabs.forEach(item => {
            item.classList.remove("active");
        });
        // Ẩn tất cả panel
        panels.forEach(panel => {
            panel.classList.remove("active");
        });
        // Kích hoạt tab được chọn
        tab.classList.add("active");
        const target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add("active");
        // Nếu mở mô hình 3D
        if (tab.dataset.target === "atomPanel") {
            if (currentElement) {
                setTimeout(() => {
                    if (currentElement &&
                        target.classList.contains("active")) createAtomModel(currentElement);
                    }, 50);
        }} else {
            // Chuyển sang ảnh thì giải phóng mô hình
            cleanupAtomModel();
        }});
    });
}
// HIỂN THỊ ẢNH MẪU NGUYÊN TỐ
function loadElementImage(element) {
    const image = document.getElementById("elementImage");
    const caption = document.getElementById("imageCaption");
    if (!image || !caption) return;
    image.style.display = "none";
    image.removeAttribute("src");
    // Nguyên tố chưa có ảnh
    if (!element.hinhAnh) {
        caption.textContent = "Chưa có hình ảnh minh họa.";
        return;
    }
    image.onload = () => {
        image.style.display = "block";
        caption.textContent = element.chuThich || "";
    };
    image.onerror = () => {
        image.style.display = "none";
        caption.textContent = "Không thể tải hình ảnh.";
    };
    image.src = element.hinhAnh;
}

// 22. LẤY PHÂN BỐ ELECTRON TỪ JSON
function calculateElectronShells(atomicNumber) {
    const number = Number(atomicNumber);
    if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 118
    ) {
        console.error("Số hiệu nguyên tử không hợp lệ:", atomicNumber);
        return [];
    }
    const distribution = electronDistributionData[number];
    if (!distribution) {
        console.error(`Không tìm thấy phân bố electron của nguyên tố số ${number}.`);
        return [];
    }
    return [...distribution];
}

// 23. DỌN DẸP MÔ HÌNH 3D CŨ
function cleanupAtomModel() {
    if (atomAnimationId !== null) {
        cancelAnimationFrame(atomAnimationId);
        atomAnimationId = null;
    }
    atomResizeObserver?.disconnect();
    atomResizeObserver = null;
    atomControls?.dispose();
    atomControls = null;
    // Giải phóng hình học và vật liệu Three.js
    if (atomScene) {
        atomScene.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        material.dispose();
                    });
                } else {
                    object.material.dispose();
                }
            }
        });
        atomScene.clear();
        atomScene = null;
    }
    if (atomRenderer) {
        atomRenderer.dispose();
        atomRenderer.domElement.remove();
        atomRenderer = null;
    }
    const container = document.getElementById("atomModelContainer");
    if (container) container.innerHTML = "";
}

// 24. TẠO MÔ HÌNH NGUYÊN TỬ 3D
function createAtomModel(element) {
    cleanupAtomModel();
    const container = document.getElementById("atomModelContainer");
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    // 1. KHỞI TẠO SCENE
    atomScene = new THREE.Scene();
    atomScene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // 2. ÁNH SÁNG
    atomScene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const mainLight = new THREE.DirectionalLight(0xffffff,3);
    mainLight.position.set(5, 8, 10);
    atomScene.add(mainLight);
    const fillLight = new THREE.PointLight(0xdceaff, 25, 50);
    fillLight.position.set(-6, -3, 8);
    atomScene.add(fillLight);
    // 3. KHỞI TẠO RENDERER
    atomRenderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
    atomRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    atomRenderer.setSize(width, height);
    atomRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    atomRenderer.toneMappingExposure = 1.2;
    container.innerHTML = "";
    container.appendChild(atomRenderer.domElement);
    // 4. NHÓM NGUYÊN TỬ
    const atomGroup = new THREE.Group();
    atomScene.add(atomGroup);
    // 5. TÍNH SỐ PROTON VÀ NEUTRON
    const protonCount = Number(element.soNT) || 1;
    const atomicMass = Math.round(Number(element.ntKhoi) || protonCount);
    const neutronCount = Math.max(0, atomicMass - protonCount);
    const nucleonCount = protonCount + neutronCount;
    // 6. KÍCH THƯỚC HẠT NHÂN
    const nucleusRadius = 0.85;
    const nucleonRadius = Math.min(0.38, nucleusRadius / (1.15 * Math.cbrt(Math.max(nucleonCount, 1))));
    // Các hạt tiếp xúc với nhau trong mạng FCC
    const spacing = Math.sqrt(2) * nucleonRadius;
    // 7. VẬT LIỆU PROTON VÀ NEUTRON
    const protonMaterial = new THREE.MeshStandardMaterial({color: 0xff4545, roughness: 0.38, metalness: 0.02 });
    const neutronMaterial = new THREE.MeshStandardMaterial({color: 0x3985d6, roughness: 0.38, metalness: 0.02});
    const nucleonGeometry = new THREE.SphereGeometry(nucleonRadius, 24, 24);
    // 8. XẾP HẠT NHÂN THEO MẠNG FCC
    const positions = [];
    const limit = Math.ceil(Math.cbrt(nucleonCount) * 2) + 4;
    for (let x = -limit; x <= limit; x++) {
        for (let y = -limit; y <= limit; y++) {
            for (let z = -limit; z <= limit; z++) {
                if ((x + y + z) % 2 !== 0) continue;
                const position = new THREE.Vector3(x * spacing, y * spacing, z * spacing);
                positions.push(position);
            }
        }
    }
    // Ưu tiên vị trí gần tâm
    positions.sort((a, b) => {return a.lengthSq() - b.lengthSq();});
    const selectedPositions = positions.slice(0, nucleonCount);
    // 9. TẠO PROTON VÀ NEUTRON  
    const nucleons = [];
    const maxDistance =
        selectedPositions.length > 0
            ? selectedPositions[
                selectedPositions.length - 1
            ].length()
            : 0;
    selectedPositions.forEach((position, index) => {
        const isProton = index < protonCount;
        const nucleon = new THREE.Mesh(nucleonGeometry, isProton ? protonMaterial : neutronMaterial);
        nucleon.userData.targetPosition =
            position.clone();
        // Bắt đầu từ tâm
        nucleon.position.set(0, 0, 0);
        nucleon.scale.setScalar(0);
        // Hạt càng xa tâm xuất hiện càng muộn
        nucleon.userData.delay = maxDistance > 0
            ? (position.length() / maxDistance) * 0.20
            : 0;
        atomGroup.add(nucleon);
        nucleons.push(nucleon);
    });    
    // 10. PHÂN BỐ ELECTRON 
    const electronGeometry = new THREE.SphereGeometry(0.14, 24, 24);
    const electronMaterial = new THREE.MeshStandardMaterial({
        color: 0x001CBB,
        emissive: 0x001CBB,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.1
    });
    const electronShells = calculateElectronShells(element.soNT);
    const shellGroups = [];    
    // 11. TÍNH BÁN KÍNH VÒNG ELECTRON  
    const outerShellRadius = 2.5 + (electronShells.length - 1) * 1.65;
    const modelRadius = outerShellRadius + 0.2;    
    // 12. TỰ ĐỘNG CĂN CAMERA
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const distanceByHeight = modelRadius / Math.tan(verticalFov / 2);
    const distanceByWidth = modelRadius / (Math.tan(verticalFov / 2) * camera.aspect);
    const cameraDistance = Math.max(distanceByHeight, distanceByWidth) * 1.08;
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);   
    // 13. TẠO CÁC VÒNG ELECTRON
    electronShells.forEach((electronCount, index) => {
        const shellGroup = new THREE.Group();
        const radius = 2.5 + index * 1.65;
        // Quỹ đạo electron
        const orbitGeometry = new THREE.TorusGeometry(radius, 0.018, 8, 120);
        const orbitMaterial = new THREE.MeshBasicMaterial({color: 0x9aa8bb, transparent: true, opacity: 0.55});
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        shellGroup.add(orbit);
        const electrons = [];
        for (let i = 0; i < electronCount; i++) {
            const electron = new THREE.Mesh(electronGeometry, electronMaterial);
            const angle = (Math.PI * 2 * i) / electronCount;
            electron.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            shellGroup.add(electron);
            electrons.push({mesh: electron, angle: angle, radius: radius, speed: 0.008 / (index + 1)});
        }
        // Ban đầu vòng electron nằm tại tâm
        shellGroup.scale.setScalar(0);
        const delay = (index + 1) * 0.045;
        shellGroup.userData.delay = delay;
        atomGroup.add(shellGroup);
        shellGroups.push({group: shellGroup, electrons: electrons, delay: delay});
    });    
    // 14. ĐIỀU KHIỂN XOAY VÀ PHÓNG TO
    atomControls = new OrbitControls(camera, atomRenderer.domElement);
    atomControls.enableDamping = true;
    atomControls.dampingFactor = 0.05;
    atomControls.enableRotate = true;
    atomControls.enableZoom = true;
    atomControls.enablePan = false;
    atomControls.minDistance = cameraDistance * 0.5;
    atomControls.maxDistance = cameraDistance * 2.5;    
    // 15. HIỆU ỨNG BUNG HẠT NHÂN
    const animationStart = performance.now();
    const explosionDuration = 280;    
    // 16. HOẠT ẢNH
    function animate() {
        atomAnimationId = requestAnimationFrame(animate);
        const elapsed = performance.now() - animationStart;
        // Bung proton và neutron
        nucleons.forEach(nucleon => {
            const localTime = (elapsed - nucleon.userData.delay * 1000) / explosionDuration;
            const progress = Math.max(0, Math.min(1, localTime));
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const target = nucleon.userData.targetPosition;
            nucleon.position.set(target.x * eased, target.y * eased, target.z * eased);
            nucleon.scale.setScalar(eased);
        });
        // Bung các vòng electron
        shellGroups.forEach(shell => {
            const localTime = (elapsed - shell.delay * 1000) / 350;
            const progress = Math.max(0, Math.min(1, localTime));
            const eased = 1 - Math.pow(1 - progress, 3);
            shell.group.scale.setScalar(eased);
            // Electron chuyển động trên quỹ đạo
            shell.electrons.forEach(electron => {
                electron.angle += electron.speed;
                electron.mesh.position.set( Math.cos(electron.angle) * electron.radius,
                                            Math.sin(electron.angle) * electron.radius, 0);
            });
        });
        atomControls.update();
        atomRenderer.render(atomScene, camera);
    }
    animate();    
    // 17. TỰ ĐỘNG ĐIỀU CHỈNH KÍCH THƯỚC
    atomResizeObserver = new ResizeObserver(() => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (!newWidth || !newHeight) return;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        atomRenderer.setSize(
            newWidth,
            newHeight
        );
    });
    atomResizeObserver.observe(container);    
    // 18. THÔNG TIN KIỂM TRA
    console.log("Atom model:", {
        element: element.kiHieu,
        protons: protonCount,
        neutrons: neutronCount,
        electrons: electronShells,
        nucleonRadius: nucleonRadius
    });
}

// 25. KHỞI ĐỘNG WEBSITE
document.addEventListener("DOMContentLoaded", () => {
    // Tải dữ liệu và dựng bảng tuần hoàn
    loadPeriodicTableData();
    // Sự kiện modal
    setupModalEvents();
    // Sự kiện chuyển tab ảnh / 3D
    setupVisualTabs();
    // Sự kiện carousel 4 thẻ
    setupInfoCarousel();
    // Cuộn bảng tuần hoàn vào giữa màn hình
    setTimeout(() => {
        const periodicTable = document.getElementById("periodicTable");
        if (periodicTable) {
            periodicTable.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }, 500);
});