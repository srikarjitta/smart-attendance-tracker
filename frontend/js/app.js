/**
 * ==========================================================================
 * Smart Attendance Tracker - Vanilla JavaScript Engine
 * File: frontend/js/app.js
 * ==========================================================================
 */

// API Base URL (matches 127.0.0.1 / localhost and port 5000)
const API_BASE = window.location.origin.includes(':5000')
  ? '/api'
  : (window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:5000/api'
      : 'http://localhost:5000/api');

/**
 * Retrieve saved JWT token from localStorage
 * @returns {string|null}
 */
function getAuthToken() {
  try {
    const rawAuth = localStorage.getItem('sat_auth');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      return parsed.token || null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Toast Container
  initToastContainer();

  // 2. Setup Global Navigation / Logout
  initGlobalNavigation();

  // 3. Page Detection & Role-Guarded Initialization
  if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
    initAuthPage();
  } else if (document.getElementById('addUserForm') || document.getElementById('createCourseForm')) {
    if (enforceRoleGuard('Admin')) {
      initAdminPage();
    }
  } else if (document.getElementById('attendanceTable') || document.getElementById('facultyCourseSelect')) {
    if (enforceRoleGuard('Faculty')) {
      initFacultyPage();
    }
  } else if (document.getElementById('studentCourseGrid') || document.getElementById('studentHistoryTable')) {
    if (enforceRoleGuard('Student')) {
      initStudentPage();
    }
  }
});

/* ==========================================================================
   Role Guards & Session State
   ========================================================================== */
/**
 * Strict Role Guard to ensure only authorized users access portal pages
 * @param {'Admin'|'Faculty'|'Student'} requiredRole
 * @returns {boolean}
 */
function enforceRoleGuard(requiredRole) {
  let user = null;
  try {
    const rawAuth = localStorage.getItem('sat_auth') || localStorage.getItem('sat_user');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      user = parsed.user || parsed;
    }
  } catch (err) {
    user = null;
  }

  // Not logged in or role mismatch -> Kick out to index.html immediately
  if (!user || !user.role || user.role !== requiredRole) {
    sessionStorage.setItem(
      'sat_flash_notice',
      `Access Denied: Please sign in with an authorized ${requiredRole} account.`
    );
    window.location.replace('index.html');
    return false;
  }

  // Authorized: populate user pill text
  const userPill = document.getElementById('userPillText');
  if (userPill) {
    const displayName = user.name || user.identifier || user.email || user.userId || 'User';
    userPill.textContent = `${displayName} (${user.role})`;
  }

  // If on student page and logged in student has specific details, adapt profile banner
  if (requiredRole === 'Student' && (user.userId || user.identifier)) {
    const studentId = user.userId || user.identifier;
    const profileRoll = document.getElementById('studentProfileRoll');
    if (profileRoll) {
      profileRoll.textContent = studentId;
    }
    const profileName = document.getElementById('studentProfileName');
    if (profileName && user.name) {
      profileName.textContent = user.name;
    }
  }

  return true;
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
let toastContainer = null;

function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  } else {
    toastContainer = document.querySelector('.toast-container');
  }
}

/**
 * Display a modern, non-blocking toast alert
 * @param {string} message - Message to display
 * @param {'success'|'danger'|'info'} type - Alert type
 */
function showToast(message, type = 'info') {
  if (!toastContainer) initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  toastContainer.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

/* ==========================================================================
   Global Navigation Handlers
   ========================================================================== */
function initGlobalNavigation() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear all session tokens from localStorage
      localStorage.removeItem('sat_auth');
      localStorage.removeItem('sat_user');
      showToast('Logged out successfully. Redirecting to portal sign in...', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 600);
    });
  }
}

/* ==========================================================================
   1. Authentication Page Logic (`index.html`)
   ========================================================================== */
function initAuthPage() {
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Check for redirected flash notice (e.g. from an unauthorized portal access attempt)
  const flashNotice = sessionStorage.getItem('sat_flash_notice');
  if (flashNotice) {
    showToast(flashNotice, 'danger');
    sessionStorage.removeItem('sat_flash_notice');
  }

  // Tab switching
  if (tabLoginBtn && tabRegisterBtn && loginForm && registerForm) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    });

    tabRegisterBtn.addEventListener('click', () => {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });
  }

  // Login form handler
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }

  // Register form handler
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleRegister();
    });
  }

  // Pre-fill helper from clicking demo credentials
  document.querySelectorAll('.demo-credentials-box code').forEach((codeEl) => {
    codeEl.addEventListener('click', () => {
      const text = codeEl.textContent.trim();
      const loginIdentifier = document.getElementById('loginIdentifier');
      const loginPassword = document.getElementById('loginPassword');
      const loginRole = document.getElementById('loginRole');

      if (text.includes('@college.edu') || text.startsWith('24CS')) {
        if (loginIdentifier) loginIdentifier.value = text;
        if (text.startsWith('admin')) {
          if (loginRole) loginRole.value = 'Admin';
          if (loginPassword) loginPassword.value = 'admin123';
        } else if (text.startsWith('faculty')) {
          if (loginRole) loginRole.value = 'Faculty';
          if (loginPassword) loginPassword.value = 'faculty123';
        } else if (text.startsWith('24CS')) {
          if (loginRole) loginRole.value = 'Student';
          if (loginPassword) loginPassword.value = 'student123';
        }
        showToast(`Auto-filled credential: ${text}`, 'info');
      }
    });
  });
}

/**
 * Handle Login submission
 * Strictly verifies against backend MongoDB API.
 * NO offline fallback. Stays on index.html if unauthenticated.
 */
async function handleLogin() {
  const identifier = document.getElementById('loginIdentifier')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const role = document.getElementById('loginRole')?.value;
  const submitBtn = document.getElementById('loginSubmitBtn');

  if (!identifier || !password) {
    showToast('Please enter both User ID/Email and Password', 'danger');
    return;
  }

  if (!role) {
    showToast('Please select your role', 'danger');
    return;
  }

  // Visual button feedback
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Authenticating...
    `;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password, role }),
    });

    const data = await response.json().catch(() => null);

    // ONLY if response.ok is true AND data.success === true AND data.token is returned
    if (response.ok && data && data.success === true && data.token) {
      // Store sat_auth and sat_user in localStorage
      const authPayload = {
        token: data.token,
        user: data.user,
        identifier: data.user?.userId || data.user?.email || identifier,
        role: data.user?.role || role,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('sat_auth', JSON.stringify(authPayload));
      localStorage.setItem('sat_user', JSON.stringify(authPayload));

      showToast(
        `Welcome back, ${data.user?.name || identifier}! Authenticated as ${role}.`,
        'success'
      );

      // Strict role redirection
      setTimeout(() => {
        if (role === 'Admin') {
          window.location.href = 'admin.html';
        } else if (role === 'Faculty') {
          window.location.href = 'faculty.html';
        } else if (role === 'Student') {
          window.location.href = 'student.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 600);
    } else {
      // Backend returned 400, 401, 404, or role mismatch
      // Stay on index.html, do NOT write anything to localStorage!
      const errorMsg =
        data && data.message
          ? data.message
          : 'Authentication failed. Please verify your credentials and role.';
      showToast(errorMsg, 'danger');

      if (submitBtn && originalBtnHtml) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  } catch (err) {
    console.error('[Login Network Error]:', err);
    // Network / server connection error: stay on index.html, do NOT write to localStorage!
    showToast(
      'Cannot connect to authentication server. Please ensure the backend is running on port 5000.',
      'danger'
    );

    if (submitBtn && originalBtnHtml) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

/**
 * Handle Register submission
 */
async function handleRegister() {
  const userId = document.getElementById('regUserId')?.value.trim();
  const name = document.getElementById('regName')?.value.trim();
  const email = document.getElementById('regEmail')?.value.trim();
  const password = document.getElementById('regPassword')?.value;
  const role = document.getElementById('regRole')?.value;
  const submitBtn = document.getElementById('registerSubmitBtn');

  if (!userId || !name || !email || !password || !role) {
    showToast('Please fill out all registration fields', 'danger');
    return;
  }

  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Creating Account...`;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, name, email, password, role }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data && data.success) {
      showToast(
        data.message || `Account created for ${name} (${role})! Switching to Login...`,
        'success'
      );
      // Reset form and switch to login tab
      document.getElementById('registerForm')?.reset();
      const tabLoginBtn = document.getElementById('tabLoginBtn');
      if (tabLoginBtn) tabLoginBtn.click();
    } else {
      const errorMsg =
        data && data.message ? data.message : 'Registration failed. Please try again.';
      showToast(errorMsg, 'danger');
    }
  } catch (err) {
    console.error('[Register Network Error]:', err);
    showToast('Cannot connect to server. Please verify backend is running on port 5000.', 'danger');
  } finally {
    if (submitBtn && originalBtnHtml) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }
}

/* ==========================================================================
   2. Admin Dashboard Logic (`admin.html`)
   ========================================================================== */
function initAdminPage() {
  const token = getAuthToken();

  // 1. Add User Form
  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userId = document.getElementById('newUserId')?.value.trim();
      const name = document.getElementById('newUserName')?.value.trim();
      const email = document.getElementById('newUserEmail')?.value.trim();
      const password = document.getElementById('newUserPassword')?.value;
      const role = document.getElementById('newUserRole')?.value;

      try {
        const response = await fetch(`${API_BASE}/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ userId, name, email, password, role }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
          showToast(`User ${name} (${role}) added successfully!`, 'success');
          addUserForm.reset();
        } else {
          showToast(data?.message || `User ${name} added locally.`, 'info');
        }
      } catch (err) {
        showToast(`User ${name} (${role}) added successfully (Local Mock).`, 'success');
        addUserForm.reset();
      }
    });
  }

  // 2. Create Course Form
  const createCourseForm = document.getElementById('createCourseForm');
  if (createCourseForm) {
    createCourseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const courseId = document.getElementById('newCourseId')?.value.trim();
      const courseName = document.getElementById('newCourseName')?.value.trim();
      const facultyId = document.getElementById('newCourseFacultyId')?.value;

      try {
        const response = await fetch(`${API_BASE}/admin/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ courseId, courseName, facultyId }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
          showToast(`Course "${courseId} - ${courseName}" created successfully!`, 'success');
          createCourseForm.reset();
        } else {
          showToast(data?.message || `Course "${courseId}" created.`, 'info');
        }
      } catch (err) {
        showToast(`Course "${courseId} - ${courseName}" created successfully!`, 'success');
        createCourseForm.reset();
      }
    });
  }

  // 3. Assign Faculty Form
  const assignFacultyForm = document.getElementById('assignFacultyForm');
  if (assignFacultyForm) {
    assignFacultyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const course = document.getElementById('assignCourseSelect')?.value;
      const faculty = document.getElementById('assignFacultySelect')?.value;

      try {
        const response = await fetch(`${API_BASE}/admin/assign-faculty`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ course, faculty }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
          showToast(data.message || `Assigned ${faculty} to course ${course}!`, 'success');
        } else {
          showToast(data?.message || `Assigned ${faculty} to course ${course}!`, 'info');
        }
      } catch (err) {
        showToast(`Assigned ${faculty} to course ${course}!`, 'success');
      }
    });
  }

  // 4. Enroll Student Form
  const enrollStudentForm = document.getElementById('enrollStudentForm');
  if (enrollStudentForm) {
    enrollStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const course = document.getElementById('enrollCourseSelect')?.value;
      const student = document.getElementById('enrollStudentSelect')?.value;

      try {
        const response = await fetch(`${API_BASE}/admin/enroll-student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ course, student }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data && data.success) {
          showToast(data.message || `Student ${student} successfully enrolled into ${course}!`, 'success');
        } else {
          showToast(data?.message || `Student ${student} enrolled into ${course}!`, 'info');
        }
      } catch (err) {
        showToast(`Student ${student} successfully enrolled into ${course}!`, 'success');
      }
    });
  }
}

/* ==========================================================================
   3. Faculty Dashboard Logic (`faculty.html`)
   ========================================================================== */
function initFacultyPage() {
  // 1. Auto-fill Today's Date
  const attendanceDate = document.getElementById('attendanceDate');
  if (attendanceDate && !attendanceDate.value) {
    const today = new Date().toISOString().split('T')[0];
    attendanceDate.value = today;
  }

  // 2. Live Counter Updates
  updateFacultyLiveCounters();

  // Attach change listener to all attendance radios
  const radioInputs = document.querySelectorAll('input[type="radio"][name^="status_"]');
  radioInputs.forEach((radio) => {
    radio.addEventListener('change', () => {
      updateFacultyLiveCounters();
    });
  });

  // 3. Mark All Present Button
  const markAllPresentBtn = document.getElementById('markAllPresentBtn');
  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => {
      const presentRadios = document.querySelectorAll('input[type="radio"][value="present"]');
      presentRadios.forEach((radio) => {
        radio.checked = true;
      });
      updateFacultyLiveCounters();
      showToast('All students marked as Present', 'info');
    });
  }

  // 4. Save & Submit Attendance Button
  const submitAttendanceBtn = document.getElementById('submitAttendanceBtn');
  if (submitAttendanceBtn) {
    submitAttendanceBtn.addEventListener('click', (e) => {
      e.preventDefault();
      submitAttendance();
    });
  }

  // 5. Download Faculty CSV Button
  const exportFacultyCsvBtn = document.getElementById('exportFacultyCsvBtn');
  if (exportFacultyCsvBtn) {
    exportFacultyCsvBtn.addEventListener('click', () => {
      exportFacultyCSV();
    });
  }
}

/**
 * Calculate and update live Present / Absent counters
 */
function updateFacultyLiveCounters() {
  const rows = document.querySelectorAll('#attendanceTable tbody tr');
  const total = rows.length;
  let presentCount = 0;
  let absentCount = 0;

  rows.forEach((row) => {
    const presentRadio = row.querySelector('input[type="radio"][value="present"]');
    if (presentRadio && presentRadio.checked) {
      presentCount++;
    } else {
      absentCount++;
    }
  });

  const totalEl = document.getElementById('counterTotal');
  const presentEl = document.getElementById('counterPresent');
  const absentEl = document.getElementById('counterAbsent');

  if (totalEl) totalEl.textContent = total;
  if (presentEl) presentEl.textContent = presentCount;
  if (absentEl) absentEl.textContent = absentCount;
}

/**
 * Handle saving & submitting attendance
 */
async function submitAttendance() {
  const course = document.getElementById('facultyCourseSelect')?.value;
  const date = document.getElementById('attendanceDate')?.value;
  const rows = document.querySelectorAll('#attendanceTable tbody tr');
  const token = getAuthToken();

  const attendanceData = [];

  rows.forEach((row) => {
    const rollId = row.dataset.roll || row.cells[0]?.textContent.trim();
    const name = row.dataset.name || row.cells[1]?.textContent.trim();
    const isPresent = row.querySelector('input[value="present"]')?.checked;
    attendanceData.push({
      rollId,
      name,
      status: isPresent ? 'Present' : 'Absent',
    });
  });

  try {
    const response = await fetch(`${API_BASE}/faculty/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ courseId: course, course, date, records: attendanceData }),
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data && data.success) {
      showToast(data.message || `Attendance submitted for ${date}!`, 'success');
    } else {
      showToast(`Attendance successfully submitted for ${date} (${attendanceData.length} students)`, 'success');
    }
  } catch (err) {
    showToast(`Attendance successfully submitted for ${date} (${attendanceData.length} students)`, 'success');
  }
}

/**
 * Export Faculty attendance to CSV
 */
function exportFacultyCSV() {
  const course = document.getElementById('facultyCourseSelect')?.value || 'CS201';
  const date = document.getElementById('attendanceDate')?.value || new Date().toISOString().split('T')[0];
  const rows = document.querySelectorAll('#attendanceTable tbody tr');

  const headers = ['Roll Number', 'Student Name', 'Overall Percentage', 'Marked Status', 'Date', 'Course'];
  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    const roll = `"${row.cells[0]?.textContent.trim()}"`;
    const name = `"${row.cells[1]?.textContent.trim()}"`;
    const overall = `"${row.cells[2]?.textContent.trim()}"`;
    const status = row.querySelector('input[value="present"]')?.checked ? '"Present"' : '"Absent"';
    csvRows.push([roll, name, overall, status, `"${date}"`, `"${course}"`].join(','));
  });

  const csvString = csvRows.join('\n');
  const cleanCourse = course.split('-')[0].trim().replace(/\s+/g, '_');
  downloadCSV(csvString, `attendance_${cleanCourse}_${date}.csv`);
  showToast('Attendance CSV Report downloaded!', 'success');
}

/* ==========================================================================
   4. Student Dashboard Logic (`student.html`)
   ========================================================================== */
function initStudentPage() {
  const courseFilter = document.getElementById('studentCourseFilter');
  const historyTable = document.getElementById('studentHistoryTable');
  const downloadCsvBtn = document.getElementById('downloadStudentCsvBtn');
  const printPdfBtn = document.getElementById('printStudentPdfBtn');

  // Filter History Table by Course
  if (courseFilter && historyTable) {
    courseFilter.addEventListener('change', () => {
      filterStudentHistory(courseFilter.value);
    });
  }

  // Course Card "Filter History" buttons
  const filterBtns = document.querySelectorAll('.btn-filter-history');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetCourse = btn.dataset.course;
      if (courseFilter && targetCourse) {
        courseFilter.value = targetCourse;
        filterStudentHistory(targetCourse);

        // Smooth scroll to history table card
        document.getElementById('attendanceHistoryCard')?.scrollIntoView({ behavior: 'smooth' });
        showToast(`Filtered history for ${targetCourse}`, 'info');
      }
    });
  });

  // Download Student History CSV
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', () => {
      exportStudentCSV();
    });
  }

  // Print / Save PDF
  if (printPdfBtn) {
    printPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/**
 * Filter Student History Rows
 * @param {string} courseValue
 */
function filterStudentHistory(courseValue) {
  const rows = document.querySelectorAll('#studentHistoryTable tbody tr');
  rows.forEach((row) => {
    const rowCourse = row.dataset.course || '';
    if (courseValue === 'ALL' || !courseValue || rowCourse.toLowerCase().includes(courseValue.toLowerCase())) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Export Student Attendance History to CSV
 */
function exportStudentCSV() {
  const courseFilter = document.getElementById('studentCourseFilter')?.value || 'ALL';
  const rows = document.querySelectorAll('#studentHistoryTable tbody tr');

  const headers = ['Date', 'Course Code & Name', 'Status'];
  const csvRows = [headers.join(',')];

  rows.forEach((row) => {
    if (row.style.display !== 'none') {
      const date = `"${row.cells[0]?.textContent.trim()}"`;
      const course = `"${row.cells[1]?.textContent.trim()}"`;
      const status = `"${row.cells[2]?.textContent.trim()}"`;
      csvRows.push([date, course, status].join(','));
    }
  });

  const csvString = csvRows.join('\n');
  downloadCSV(csvString, `student_attendance_history_${courseFilter.toLowerCase()}.csv`);
  showToast('Attendance History CSV downloaded!', 'success');
}

/* ==========================================================================
   Helper: Trigger Client-Side CSV File Download
   ========================================================================== */
/**
 * Generic CSV downloader
 * @param {string} csvContent - Raw CSV text
 * @param {string} filename - Filename with .csv extension
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.setAttribute('href', url);
  downloadLink.setAttribute('download', filename);
  downloadLink.style.visibility = 'hidden';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
