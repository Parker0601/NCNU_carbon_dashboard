// 模擬數據
const employeeData = {
  employees: [
    { id: "EMP001", name: "張偉", position: "員工" },
    { id: "EMP002", name: "李梅", position: "員工" },
    { id: "EMP003", name: "王芳", position: "員工" }
  ]
};

const reviewData = {
  reviews: [
    { name: "張偉", id: "EMP001", position: "員工" },
    { name: "李梅", id: "EMP002", position: "員工" },
    { name: "王芳", id: "EMP003", position: "員工" }
  ]
};

// 等待 DOM 載入完成後再執行
document.addEventListener("DOMContentLoaded", () => {
  // 1) 把 [[ ]] 換回 {{ }}，避免外層 HBS 吃掉模板
  const getTpl = (id) =>
    document.getElementById(id).innerHTML
      .replace(/\[\[/g, "{{")
      .replace(/\]\]/g, "}}");

  // 2) 編譯 Handlebars 模板
  const employeeTemplate = Handlebars.compile(getTpl("employee-template"));
  const reviewTemplate = Handlebars.compile(getTpl("review-template"));

  // 3) 渲染初始數據（會覆蓋掉占位「載入中…」）
  document.getElementById("employeeList").innerHTML = employeeTemplate(employeeData);
  document.getElementById("reviewList").innerHTML = reviewTemplate(reviewData);

  // 4) 搜尋功能（同名在兩表都過濾）
  document.getElementById("searchInput").addEventListener("input", function (e) {
    const kw = e.target.value.toLowerCase();
    const filteredEmployees = {
      employees: employeeData.employees.filter(emp =>
        String(emp.name).toLowerCase().includes(kw)
      )
    };
    const filteredReviews = {
      reviews: reviewData.reviews.filter(rev =>
        String(rev.name).toLowerCase().includes(kw)
      )
    };
    document.getElementById("employeeList").innerHTML = employeeTemplate(filteredEmployees);
    document.getElementById("reviewList").innerHTML = reviewTemplate(filteredReviews);
  });

  // 5) 按鈕事件處理
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("btn-upgrade")) {
      const name = e.target.dataset.name;
      const id = e.target.dataset.id;
      console.log(`升級為主管: ${name || id}`);
      // TODO: fetch(`${API}/promotions/apply/${id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    } else if (e.target.classList.contains("btn-approve")) {
      console.log(`核准升級: ${e.target.dataset.id}`);
      // TODO: fetch(`${API}/promotions/${id}/approve`, { method: 'POST', headers: {...} })
    } else if (e.target.classList.contains("btn-reject")) {
      console.log(`拒絕升級: ${e.target.dataset.id}`);
      // TODO: fetch(`${API}/promotions/${id}/reject`, { method: 'POST', headers: {...} })
    }
  });
});
