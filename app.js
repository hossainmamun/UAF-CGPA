(function () {
  "use strict";

  // DOM references - will be initialized after DOM is loaded
  let semestersContainer, addSemesterBtn, calculateBtn, resultContainer;
  let actionsContainer, downloadBtn, copyBtn, resetBtn;

  let semesterCounter = 0;

  /**
   * Convert marks to grade letter based on UAF official scale.
   * @param {number} marks
   * @returns {string}
   */
  function gradeFromMarks(marks) {
    if (isNaN(marks)) return "";
    const m = parseFloat(marks);
    if (m >= 85) return "A";
    if (m >= 80) return "A-";
    if (m >= 75) return "B+";
    if (m >= 70) return "B";
    if (m >= 65) return "B-";
    if (m >= 61) return "C+";
    if (m >= 58) return "C";
    if (m >= 55) return "C-";
    if (m >= 50) return "D";
    return "F";
  }

  /**
   * Convert grade letter to grade points.
   * @param {string} grade
   * @returns {number}
   */
  function gradePoints(grade) {
    switch ((grade || "").toUpperCase()) {
      case "A":
        return 4.0;
      case "A-":
        return 3.7;
      case "B+":
        return 3.3;
      case "B":
        return 3.0;
      case "B-":
        return 2.7;
      case "C+":
        return 2.3;
      case "C":
        return 2.0;
      case "C-":
        return 1.7;
      case "D+":
        return 1.3; // In some scales D+ exists; optional
      case "D":
        return 1.0;
      default:
        return 0.0;
    }
  }

  /**
   * Initialize DOM references
   */
  function initDOMReferences() {
    semestersContainer = document.getElementById("uaf-calc-semesters");
    addSemesterBtn = document.getElementById("uaf-calc-add-semester");
    calculateBtn = document.getElementById("uaf-calc-calculate");
    resultContainer = document.getElementById("uaf-calc-result");
    actionsContainer = document.getElementById("uaf-calc-actions");
    downloadBtn = document.getElementById("uaf-calc-download");
    copyBtn = document.getElementById("uaf-calc-copy");
    resetBtn = document.getElementById("uaf-calc-reset");
  }

  /**
   * Save current UI state into sessionStorage
   */
  function saveState() {
    const data = [];
    const semesters = semestersContainer.querySelectorAll(".uaf-calc-semester");
    semesters.forEach((sem) => {
      const courses = [];
      const courseRows = sem.querySelectorAll(".uaf-calc-course-row");
      courseRows.forEach((row) => {
        const name = row.querySelector(".uaf-calc-name").value.trim();
        const credit =
          parseFloat(row.querySelector(".uaf-calc-credit").value) || 0;
        const inputType = row.querySelector(".uaf-calc-input-type").value;
        const marksInput = row.querySelector(".uaf-calc-marks");
        const marks =
          marksInput.value !== "" ? parseFloat(marksInput.value) : null;
        const gradeSelect = row.querySelector(".uaf-calc-grade");
        const grade = gradeSelect.value;
        courses.push({ name, credit, inputType, marks, grade });
      });
      data.push({ courses });
    });
    try {
      sessionStorage.setItem("uaf-calc-data", JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save state:", e);
    }
  }

  /**
   * Load UI state from sessionStorage
   */
  function loadState() {
    const raw = sessionStorage.getItem("uaf-calc-data");
    if (!raw) {
      // create an initial semester if none exists
      addSemester();
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length) {
        data.forEach((semData) => addSemester(semData));
      } else {
        addSemester();
      }
    } catch (e) {
      console.warn("Failed to parse saved state:", e);
      addSemester();
    }
  }

  /**
   * Load result from session storage
   */
  function loadResult() {
    const raw = sessionStorage.getItem("uaf-calc-result");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        showEnhancedResult(data);
        actionsContainer.style.display = "flex";
      } catch (e) {
        console.warn("Failed to load saved result:", e);
      }
    }
  }

  /**
   * Create a new semester and append to container
   * @param {Object} semData optional previously saved semester data
   */
  function addSemester(semData) {
    semesterCounter++;
    const semEl = document.createElement("div");
    semEl.className = "uaf-calc-semester";
    semEl.dataset.semesterId = `semester-${semesterCounter}`;

    // header
    const header = document.createElement("div");
    header.className = "uaf-calc-semester-header";
    const title = document.createElement("div");
    title.className = "uaf-calc-semester-title";
    title.textContent = `Semester ${semesterCounter}`;
    header.appendChild(title);
    const controls = document.createElement("div");
    controls.className = "uaf-calc-semester-controls";

    // Remove semester button
    const removeSemesterBtn = document.createElement("button");
    removeSemesterBtn.type = "button";
    removeSemesterBtn.innerHTML =
      '<i class="fa-solid fa-trash-can"></i>Remove Semester';
    removeSemesterBtn.className = "st-general-btn uaf-calc-remove-semester";
    removeSemesterBtn.addEventListener("click", () => {
      semEl.remove();
      // Update semester titles after removal
      updateSemesterTitles();
      // Clear result when semester is removed
      hideResult();
      saveState();
    });
    controls.appendChild(removeSemesterBtn);

    const addCourseBtn = document.createElement("button");
    addCourseBtn.type = "button";
    addCourseBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Course';
    addCourseBtn.className = "st-general-btn uaf-calc-add-course";
    addCourseBtn.addEventListener("click", () => addCourseRow(semEl));
    controls.appendChild(addCourseBtn);
    header.appendChild(controls);
    semEl.appendChild(header);

    // course container
    const courseContainer = document.createElement("div");
    courseContainer.className = "uaf-calc-courses";
    semEl.appendChild(courseContainer);

    // if saved data present, create rows accordingly
    if (semData && Array.isArray(semData.courses) && semData.courses.length) {
      semData.courses.forEach((course) => addCourseRow(semEl, course));
    } else {
      // create one empty course row
      addCourseRow(semEl);
    }

    semestersContainer.appendChild(semEl);
  }

  /**
   * Update semester titles after removal
   */
  function updateSemesterTitles() {
    const semesters = semestersContainer.querySelectorAll(".uaf-calc-semester");
    semesters.forEach((sem, index) => {
      const title = sem.querySelector(".uaf-calc-semester-title");
      title.textContent = `Semester ${index + 1}`;
      sem.dataset.semesterId = `semester-${index + 1}`;
    });
  }

  /**
   * Create a course row within a semester
   * @param {HTMLElement} semEl
   * @param {Object} courseData optional previous course state
   */
  function addCourseRow(semEl, courseData = {}) {
    const courseContainer = semEl.querySelector(".uaf-calc-courses");
    const row = document.createElement("div");
    row.className = "uaf-calc-course-row";

    // Course Name - OPTIONAL, no validation
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Course Name (optional)";
    nameInput.className = "st-general-input uaf-calc-name";
    nameInput.value = courseData.name || "";
    nameInput.addEventListener("input", saveState);
    row.appendChild(nameInput);

    // Credit Hours with placeholder
    const creditSelect = document.createElement("select");
    creditSelect.className = "st-general-select uaf-calc-credit";

    // Add placeholder option
    const creditPlaceholder = document.createElement("option");
    creditPlaceholder.value = "";
    creditPlaceholder.textContent = "Select Credit";
    creditPlaceholder.disabled = true;
    creditPlaceholder.selected = true;
    creditPlaceholder.className = "uaf-calc-placeholder";
    creditSelect.appendChild(creditPlaceholder);

    // Add credit options
    for (let i = 1; i <= 6; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = i;
      if (courseData.credit && courseData.credit == i) {
        option.selected = true;
        creditPlaceholder.selected = false;
      }
      creditSelect.appendChild(option);
    }

    // Set value from saved data if available
    if (courseData.credit && courseData.credit > 0) {
      creditSelect.value = courseData.credit;
      creditPlaceholder.selected = false;
    }

    creditSelect.addEventListener("change", saveState);
    row.appendChild(creditSelect);

    // Input Type Selector (Marks or Grade)
    const inputTypeSelect = document.createElement("select");
    inputTypeSelect.className = "st-general-select uaf-calc-input-type";

    const marksOption = document.createElement("option");
    marksOption.value = "marks";
    marksOption.textContent = "Marks";

    const gradeOption = document.createElement("option");
    gradeOption.value = "grade";
    gradeOption.textContent = "Grade";

    inputTypeSelect.appendChild(marksOption);
    inputTypeSelect.appendChild(gradeOption);
    inputTypeSelect.value = courseData.inputType || "grade";
    inputTypeSelect.addEventListener("change", function () {
      toggleInputFields(row, this.value);
      saveState();
    });
    row.appendChild(inputTypeSelect);

    // Marks Input Container
    const marksContainer = document.createElement("div");
    marksContainer.className = "uaf-calc-input-field";
    marksContainer.style.display =
      inputTypeSelect.value === "marks" ? "block" : "none";

    const marksInput = document.createElement("input");
    marksInput.type = "number";
    marksInput.min = 0;
    marksInput.max = 100;
    marksInput.step = "0.01";
    marksInput.placeholder = "Marks %";
    marksInput.className = "st-general-input uaf-calc-marks";
    if (courseData.marks != null) {
      marksInput.value = courseData.marks;
    }
    marksInput.addEventListener("input", function () {
      const gradeSelect = row.querySelector(".uaf-calc-grade");
      const grade = gradeFromMarks(this.value);
      if (gradeSelect) {
        gradeSelect.value = grade;
      }
      saveState();
    });
    marksContainer.appendChild(marksInput);
    row.appendChild(marksContainer);

    // Grade Select Container with placeholder
    const gradeContainer = document.createElement("div");
    gradeContainer.className = "uaf-calc-input-field";
    gradeContainer.style.display =
      inputTypeSelect.value === "grade" ? "block" : "none";

    const gradeSelect = document.createElement("select");
    gradeSelect.className = "st-general-select uaf-calc-grade";

    // Add placeholder option
    const gradePlaceholder = document.createElement("option");
    gradePlaceholder.value = "";
    gradePlaceholder.textContent = "Select Grade";
    gradePlaceholder.disabled = true;
    gradePlaceholder.selected = true;
    gradePlaceholder.className = "uaf-calc-placeholder";
    gradeSelect.appendChild(gradePlaceholder);

    // Add grade options
    const grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];
    grades.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      gradeSelect.appendChild(opt);
    });

    // Determine initial grade value
    let initialGrade = "";
    if (courseData.grade && courseData.grade !== "") {
      initialGrade = courseData.grade;
      gradeSelect.value = initialGrade;
      gradePlaceholder.selected = false;
    } else if (courseData.marks != null && inputTypeSelect.value === "marks") {
      initialGrade = gradeFromMarks(courseData.marks) || "";
      if (initialGrade) {
        gradeSelect.value = initialGrade;
        gradePlaceholder.selected = false;
      }
    }

    gradeSelect.addEventListener("change", saveState);
    gradeContainer.appendChild(gradeSelect);
    row.appendChild(gradeContainer);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "uaf-calc-remove-course";
    removeBtn.innerHTML = "<i class='fa-solid fa-trash-can-arrow-up'></i>";
    removeBtn.addEventListener("click", () => {
      row.remove();
      saveState();
    });
    row.appendChild(removeBtn);

    courseContainer.appendChild(row);
  }

  /**
   * Toggle between marks and grade input fields
   */
  function toggleInputFields(row, inputType) {
    const marksField = row.querySelector(".uaf-calc-marks").parentElement;
    const gradeField = row.querySelector(".uaf-calc-grade").parentElement;

    if (inputType === "marks") {
      marksField.style.display = "block";
      gradeField.style.display = "none";
      // Auto-calculate grade from marks if marks exist
      const marksInput = row.querySelector(".uaf-calc-marks");
      if (marksInput.value) {
        const gradeSelect = row.querySelector(".uaf-calc-grade");
        const grade = gradeFromMarks(marksInput.value);
        if (grade) {
          gradeSelect.value = grade;
        }
      }
    } else {
      marksField.style.display = "none";
      gradeField.style.display = "block";
    }
  }

  /**
   * Validate all inputs before calculation - SIMPLIFIED with window.alert()
   */
  function validateInputs() {
    const semesters = semestersContainer.querySelectorAll(".uaf-calc-semester");
    if (!semesters.length) {
      window.alert("Please add at least one semester.");
      return false;
    }

    // Check each semester
    for (let semIndex = 0; semIndex < semesters.length; semIndex++) {
      const sem = semesters[semIndex];
      const courseRows = sem.querySelectorAll(".uaf-calc-course-row");

      if (courseRows.length === 0) {
        window.alert(
          `Semester ${
            semIndex + 1
          } has no courses. Please add at least one course.`,
        );
        return false;
      }

      // Check each course in the semester
      for (
        let courseIndex = 0;
        courseIndex < courseRows.length;
        courseIndex++
      ) {
        const row = courseRows[courseIndex];

        // Validate credit selection
        const creditSelect = row.querySelector(".uaf-calc-credit");
        if (!creditSelect.value || creditSelect.value === "") {
          window.alert(
            `Please select credit hours for Semester ${semIndex + 1}, Course ${
              courseIndex + 1
            }.`,
          );
          return false;
        }

        // Validate input type and corresponding field
        const inputTypeSelect = row.querySelector(".uaf-calc-input-type");
        const inputType = inputTypeSelect.value;

        if (inputType === "marks") {
          const marksInput = row.querySelector(".uaf-calc-marks");
          const marksValue = marksInput.value.trim();

          if (!marksValue) {
            window.alert(
              `Please enter marks for Semester ${semIndex + 1}, Course ${
                courseIndex + 1
              }.`,
            );
            return false;
          } else {
            const marksNum = parseFloat(marksValue);
            if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
              window.alert(
                `Please enter valid marks between 0-100 for Semester ${
                  semIndex + 1
                }, Course ${courseIndex + 1}.`,
              );
              return false;
            }
          }
        } else if (inputType === "grade") {
          const gradeSelect = row.querySelector(".uaf-calc-grade");
          if (!gradeSelect.value || gradeSelect.value === "") {
            window.alert(
              `Please select a grade for Semester ${semIndex + 1}, Course ${
                courseIndex + 1
              }.`,
            );
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Calculate GPA per semester and overall CGPA
   */
  function calculate() {
    // Hide result container first
    hideResult();

    // Validate inputs
    if (!validateInputs()) {
      return;
    }

    const semesters = semestersContainer.querySelectorAll(".uaf-calc-semester");
    if (!semesters.length) return;

    let totalQuality = 0;
    let totalCredits = 0;
    const semesterResults = [];

    semesters.forEach((sem, sIndex) => {
      const courseRows = sem.querySelectorAll(".uaf-calc-course-row");
      let semQuality = 0;
      let semCredits = 0;
      courseRows.forEach((row) => {
        const credit =
          parseFloat(row.querySelector(".uaf-calc-credit").value) || 0;
        const grade = row.querySelector(".uaf-calc-grade").value;
        const gp = gradePoints(grade);
        semQuality += gp * credit;
        semCredits += credit;
      });
      const semGPA = semCredits > 0 ? semQuality / semCredits : 0;
      totalQuality += semQuality;
      totalCredits += semCredits;
      semesterResults.push({
        semester: sIndex + 1,
        gpa: semGPA,
        credits: semCredits,
      });
    });

    const cgpa = totalCredits > 0 ? totalQuality / totalCredits : 0;

    // Enhanced result display with structured data
    showEnhancedResult({
      cgpa: cgpa.toFixed(3),
      totalCredits: totalCredits,
      semesterResults: semesterResults,
    });

    actionsContainer.style.display = "flex";

    // Persist result and state
    sessionStorage.setItem(
      "uaf-calc-result",
      JSON.stringify({
        cgpa: cgpa.toFixed(3),
        totalCredits: totalCredits,
        semesterResults: semesterResults,
      }),
    );
    saveState();
  }

  /**
   * Show enhanced result with modern UI
   */
  function showEnhancedResult(data) {
    resultContainer.innerHTML = "";

    // Create header
    const header = document.createElement("div");
    header.className = "uaf-calc-result-header";

    const title = document.createElement("div");
    title.className = "uaf-calc-result-title";
    title.innerHTML =
      '<i class="fa-solid fa-chart-line"></i>Academic Performance Summary';
    header.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "uaf-calc-result-subtitle";
    subtitle.textContent =
      "University of Agriculture, Faisalabad • Official 4-Point Scale";
    header.appendChild(subtitle);

    resultContainer.appendChild(header);

    // Create content container
    const content = document.createElement("div");
    content.className = "uaf-calc-result-content";

    // Summary Cards
    const summaryCards = document.createElement("div");
    summaryCards.className = "uaf-calc-summary-cards";

    // Overall CGPA Card
    const overallCard = document.createElement("div");
    overallCard.className = "uaf-calc-summary-card overall";

    const overallLabel = document.createElement("p");
    overallLabel.className = "uaf-calc-card-label";
    overallLabel.textContent = "Overall CGPA";
    overallCard.appendChild(overallLabel);

    const overallValue = document.createElement("strong");
    overallValue.className = "uaf-calc-card-value";
    overallValue.textContent = data.cgpa;
    overallCard.appendChild(overallValue);

    const overallDetails = document.createElement("p");
    overallDetails.className = "uaf-calc-card-details";
    overallDetails.textContent = "4.0 Scale";
    overallCard.appendChild(overallDetails);

    summaryCards.appendChild(overallCard);

    // Total Credits Card
    const creditsCard = document.createElement("div");
    creditsCard.className = "uaf-calc-summary-card";

    const creditsLabel = document.createElement("p");
    creditsLabel.className = "uaf-calc-card-label";
    creditsLabel.textContent = "Total Credits";
    creditsCard.appendChild(creditsLabel);

    const creditsValue = document.createElement("strong");
    creditsValue.className = "uaf-calc-card-value";
    creditsValue.textContent = data.totalCredits;
    creditsCard.appendChild(creditsValue);

    const creditsDetails = document.createElement("p");
    creditsDetails.className = "uaf-calc-card-details";
    creditsDetails.textContent = "Completed Hours";
    creditsCard.appendChild(creditsDetails);

    summaryCards.appendChild(creditsCard);

    // Semesters Count Card
    const semestersCard = document.createElement("div");
    semestersCard.className = "uaf-calc-summary-card";

    const semestersLabel = document.createElement("p");
    semestersLabel.className = "uaf-calc-card-label";
    semestersLabel.textContent = "Semesters";
    semestersCard.appendChild(semestersLabel);

    const semestersValue = document.createElement("strong");
    semestersValue.className = "uaf-calc-card-value";
    semestersValue.textContent = data.semesterResults.length;
    semestersCard.appendChild(semestersValue);

    const semestersDetails = document.createElement("p");
    semestersDetails.className = "uaf-calc-card-details";
    semestersDetails.textContent = "Total Semesters";
    semestersCard.appendChild(semestersDetails);

    summaryCards.appendChild(semestersCard);

    content.appendChild(summaryCards);

    // Semester Results Section
    const semesterSection = document.createElement("div");
    semesterSection.className = "uaf-calc-semester-results";

    const semesterTitle = document.createElement("div");
    semesterTitle.className = "uaf-calc-semester-results-title";
    semesterTitle.textContent = "Semester-wise GPA";
    semesterSection.appendChild(semesterTitle);

    data.semesterResults.forEach((result) => {
      const semesterItem = document.createElement("div");
      semesterItem.className = "uaf-calc-semester-item";

      const semesterName = document.createElement("div");
      semesterName.className = "uaf-calc-semester-name";
      semesterName.textContent = `Semester ${result.semester}`;
      semesterItem.appendChild(semesterName);

      const gpaContainer = document.createElement("div");
      gpaContainer.style.textAlign = "right";

      const semesterGPA = document.createElement("div");
      semesterGPA.className = "uaf-calc-semester-gpa";
      semesterGPA.textContent = result.gpa.toFixed(3);
      gpaContainer.appendChild(semesterGPA);

      const semesterCredits = document.createElement("div");
      semesterCredits.className = "uaf-calc-semester-credits";
      semesterCredits.textContent = `${result.credits} Credits`;
      gpaContainer.appendChild(semesterCredits);

      semesterItem.appendChild(gpaContainer);
      semesterSection.appendChild(semesterItem);
    });

    content.appendChild(semesterSection);

    // Total Credits Section
    const totalSection = document.createElement("div");
    totalSection.className = "uaf-calc-total-section";

    const totalLabel = document.createElement("p");
    totalLabel.textContent = "Total Academic Credits";
    totalSection.appendChild(totalLabel);

    const totalCredits = document.createElement("strong");
    totalCredits.className = "uaf-calc-total-credits";
    totalCredits.innerHTML = `<p>Credit Hours: <span>${data.totalCredits}</span></p>`;
    totalSection.appendChild(totalCredits);

    const dateStamp = document.createElement("p");
    dateStamp.style.fontSize = "0.8rem";
    dateStamp.style.color = "var(--uaf-calc-text)";
    dateStamp.style.opacity = "0.6";
    dateStamp.style.marginTop = "0.5rem";
    dateStamp.textContent = `Calculated on ${new Date().toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    )}`;
    totalSection.appendChild(dateStamp);

    content.appendChild(totalSection);

    resultContainer.appendChild(content);
    resultContainer.classList.add("show");
  }

  /**
   * Hide result container
   */
  function hideResult() {
    resultContainer.classList.remove("show");
    resultContainer.innerHTML = "";
    actionsContainer.style.display = "none";
    sessionStorage.removeItem("uaf-calc-result");
  }

  /**
   * Copy result text to clipboard
   */
  function copyResult() {
    const contentDiv = resultContainer.querySelector(
      ".uaf-calc-result-content",
    );
    let text = "UAF CGPA Calculator Results\n";
    text += "============================\n\n";

    // Extract summary data
    const overallCard = resultContainer.querySelector(
      ".uaf-calc-summary-card.overall",
    );
    const overallValue = overallCard
      ? overallCard.querySelector(".uaf-calc-card-value").textContent
      : "";
    const creditsCard = resultContainer.querySelectorAll(
      ".uaf-calc-summary-card",
    )[1];
    const creditsValue = creditsCard
      ? creditsCard.querySelector(".uaf-calc-card-value").textContent
      : "";

    text += `Overall CGPA: ${overallValue} (4.0 scale)\n`;
    text += `Total Credits: ${creditsValue}\n\n`;
    text += "Semester-wise Results:\n";

    const semesterItems = resultContainer.querySelectorAll(
      ".uaf-calc-semester-item",
    );
    semesterItems.forEach((item) => {
      const name = item.querySelector(".uaf-calc-semester-name").textContent;
      const gpa = item.querySelector(".uaf-calc-semester-gpa").textContent;
      const credits = item.querySelector(
        ".uaf-calc-semester-credits",
      ).textContent;
      text += `  ${name}: ${gpa} GPA (${credits})\n`;
    });

    if (!text) return;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Results copied to clipboard!");
      })
      .catch((err) => {
        alert("Failed to copy: " + err);
      });
  }

  /**
   * Download result as PDF with enhanced design
   */
  function downloadPDF() {
    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const currentDate = new Date();

      // Header with gradient effect (simulated)
      doc.setFillColor(67, 97, 238); // #4361ee
      doc.rect(0, 0, pageWidth, 30, "F");

      // Title
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Academic Performance Report", pageWidth / 2, 15, {
        align: "center",
      });

      // Subtitle
      doc.setFontSize(10);
      doc.text(
        "University of Agriculture, Faisalabad • Official 4-Point Scale",
        pageWidth / 2,
        22,
        { align: "center" },
      );

      // Reset text color
      doc.setTextColor(0, 0, 0);

      let yPos = 45;

      // Extract data from current UI
      const overallValue =
        resultContainer.querySelector(
          ".uaf-calc-summary-card.overall .uaf-calc-card-value",
        )?.textContent || "0.000";
      const creditsValue =
        resultContainer
          .querySelectorAll(".uaf-calc-summary-card")[1]
          ?.querySelector(".uaf-calc-card-value")?.textContent || "0";
      const semesterItems = resultContainer.querySelectorAll(
        ".uaf-calc-semester-item",
      );

      // Summary Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SUMMARY", 20, yPos);
      yPos += 8;

      doc.setDrawColor(67, 97, 238);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 10;

      // Summary boxes
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Overall CGPA box
      doc.setFillColor(230, 240, 255);
      doc.roundedRect(20, yPos, (pageWidth - 60) / 3, 25, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(overallValue, 20 + (pageWidth - 60) / 3 / 2, yPos + 15, {
        align: "center",
      });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Overall CGPA", 20 + (pageWidth - 60) / 3 / 2, yPos + 22, {
        align: "center",
      });

      // Total Credits box
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(
        30 + (pageWidth - 60) / 3,
        yPos,
        (pageWidth - 60) / 3,
        25,
        2,
        2,
        "F",
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(
        creditsValue,
        30 + (pageWidth - 60) / 3 + (pageWidth - 60) / 3 / 2,
        yPos + 15,
        { align: "center" },
      );
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Total Credits",
        30 + (pageWidth - 60) / 3 + (pageWidth - 60) / 3 / 2,
        yPos + 22,
        { align: "center" },
      );

      // Semesters box
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(
        40 + (2 * (pageWidth - 60)) / 3,
        yPos,
        (pageWidth - 60) / 3,
        25,
        2,
        2,
        "F",
      );
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(
        semesterItems.length.toString(),
        40 + (2 * (pageWidth - 60)) / 3 + (pageWidth - 60) / 3 / 2,
        yPos + 15,
        { align: "center" },
      );
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Semesters",
        40 + (2 * (pageWidth - 60)) / 3 + (pageWidth - 60) / 3 / 2,
        yPos + 22,
        { align: "center" },
      );

      yPos += 40;

      // Semester Details Section
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("SEMESTER-WISE RESULTS", 20, yPos);
      yPos += 8;

      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 15;

      // Table headers
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos, pageWidth - 40, 10, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Semester", 30, yPos + 7);
      doc.text("GPA", 120, yPos + 7);
      doc.text("Credits", pageWidth - 50, yPos + 7, { align: "right" });
      yPos += 12;

      // Semester rows
      doc.setFont("helvetica", "normal");
      semesterItems.forEach((item, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        const name = item.querySelector(".uaf-calc-semester-name").textContent;
        const gpa = item.querySelector(".uaf-calc-semester-gpa").textContent;
        const credits = item
          .querySelector(".uaf-calc-semester-credits")
          .textContent.match(/\d+/)[0];

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
        } else {
          doc.setFillColor(248, 249, 250);
        }
        doc.rect(20, yPos, pageWidth - 40, 10, "F");

        doc.text(name, 30, yPos + 7);
        doc.text(gpa, 120, yPos + 7);
        doc.text(credits, pageWidth - 50, yPos + 7, { align: "right" });

        yPos += 12;
      });

      yPos += 10;

      // Footer with copyright
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated by SahajTools • ${currentDate.getFullYear()}`,
        pageWidth / 2,
        285,
        { align: "center" },
      );
      doc.text(
        `Document generated on ${currentDate.toLocaleDateString()}`,
        pageWidth / 2,
        290,
        { align: "center" },
      );

      doc.save(
        `UAF_CGPA_Report_${currentDate.getFullYear()}_${(currentDate.getMonth() + 1).toString().padStart(2, "0")}_${currentDate.getDate().toString().padStart(2, "0")}.pdf`,
      );
    } else {
      alert("PDF library failed to load. Please try again.");
    }
  }

  /**
   * Reset calculator and clear session
   */
  function resetCalculator() {
    if (!confirm("This will clear all inputs and results. Proceed?")) return;
    sessionStorage.removeItem("uaf-calc-data");
    sessionStorage.removeItem("uaf-calc-result");

    // Clear UI
    semestersContainer.innerHTML = "";
    hideResult();
    actionsContainer.style.display = "none";
    semesterCounter = 0;

    // Add initial semester
    addSemester();
  }

  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    if (addSemesterBtn) {
      addSemesterBtn.addEventListener("click", () => addSemester());
    }
    if (calculateBtn) {
      calculateBtn.addEventListener("click", calculate);
    }
    if (copyBtn) {
      copyBtn.addEventListener("click", copyResult);
    }
    if (downloadBtn) {
      downloadBtn.addEventListener("click", downloadPDF);
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", resetCalculator);
    }
  }

  /**
   * Initialize the application
   */
  function init() {
    initDOMReferences();
    initEventListeners();
    loadState();
    loadResult(); // Load saved result if exists
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM already loaded
    init();
  }
})();
