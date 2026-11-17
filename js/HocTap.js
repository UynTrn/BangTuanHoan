
document.querySelectorAll(".lesson-card").forEach(article => {
    const heading = article.querySelector(":scope > h3");

    if (!heading) return;

    const lesson = document.createElement("details");
    lesson.className = article.className;

    const summary = document.createElement("summary");
    summary.className = "lesson-summary";

    const title = heading.textContent.trim();
    const match = title.match(/^(\d+)\.\s*(.*)$/);

    const number = document.createElement("span");
    number.className = "lesson-number";
    number.textContent = match ? match[1].padStart(2, "0") : "✦";

    const name = document.createElement("span");
    name.className = "lesson-title";
    name.textContent = match ? match[2] : title;

    const toggle = document.createElement("span");
    toggle.className = "lesson-toggle";
    toggle.textContent = "+";

    summary.append(number, name, toggle);

    const content = document.createElement("div");
    content.className = "lesson-detail";

    Array.from(article.childNodes).forEach(node => {
        if (node !== heading) {
            content.appendChild(node);
        }
    });

    lesson.append(summary, content);
    article.replaceWith(lesson);
});
