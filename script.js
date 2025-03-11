document.addEventListener('DOMContentLoaded', () => {
    const addProjectButton = document.getElementById('addProjectButton');
    const createProjectModal = document.getElementById('createProjectModal');
    const renameProjectModal = document.getElementById('renameProjectModal');
    const deleteProjectModal = document.getElementById('deleteProjectModal');
    const cancelButton = document.getElementById('cancelButton');
    const createButton = document.getElementById('createButton');
    const projectNameInput = document.getElementById('projectName');
    const newProjectNameInput = document.getElementById('newProjectName');
    const cancelRenameButton = document.getElementById('cancelRenameButton');
    const confirmRenameButton = document.getElementById('confirmRenameButton');
    const cancelDeleteButton = document.getElementById('cancelDeleteButton');
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    const projectsGrid = document.getElementById('projectsGrid');
    const contextMenu = document.getElementById('contextMenu');

    // เก็บรายการโปรเจค
    let projects = [];
    let selectedProject = null;

    // ย้ายปุ่ม + ไปไว้หน้าสุด
    projectsGrid.removeChild(addProjectButton);
    projectsGrid.insertBefore(addProjectButton, projectsGrid.firstChild);

    // แสดง Modal เมื่อคลิกปุ่ม +
    addProjectButton.addEventListener('click', () => {
        createProjectModal.style.display = 'flex';
    });

    // ปิด Modal เมื่อคลิกปุ่ม cancel
    cancelButton.addEventListener('click', () => {
        createProjectModal.style.display = 'none';
        projectNameInput.value = '';
    });

    // สร้างโปรเจคใหม่เมื่อคลิกปุ่ม create
    createButton.addEventListener('click', () => {
        const projectName = projectNameInput.value.trim();
        
        if (projectName) {
            createProject(projectName);
            createProjectModal.style.display = 'none';
            projectNameInput.value = '';
        } else {
            alert('กรุณากรอกชื่อโปรเจค');
        }
    });

    // ปิด Modal เมื่อคลิกพื้นหลัง
    createProjectModal.addEventListener('click', (e) => {
        if (e.target === createProjectModal) {
            createProjectModal.style.display = 'none';
            projectNameInput.value = '';
        }
    });

    renameProjectModal.addEventListener('click', (e) => {
        if (e.target === renameProjectModal) {
            renameProjectModal.style.display = 'none';
            newProjectNameInput.value = '';
        }
    });

    deleteProjectModal.addEventListener('click', (e) => {
        if (e.target === deleteProjectModal) {
            deleteProjectModal.style.display = 'none';
        }
    });

    // จัดการการคลิกขวา
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const projectCard = e.target.closest('.project-card');
        if (projectCard) {
            selectedProject = projectCard;
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        }
    });

    // ปิดเมนูคลิกขวาเมื่อคลิกที่อื่น
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // จัดการตัวเลือกในเมนูคลิกขวา
    document.getElementById('renameOption').addEventListener('click', () => {
        if (selectedProject) {
            const nameElement = selectedProject.querySelector('.project-name');
            newProjectNameInput.value = nameElement.textContent;
            renameProjectModal.style.display = 'flex';
            contextMenu.style.display = 'none';
        }
    });

    // ปิด Rename Modal เมื่อคลิกปุ่ม cancel
    cancelRenameButton.addEventListener('click', () => {
        renameProjectModal.style.display = 'none';
        newProjectNameInput.value = '';
    });

    // ยืนยันการเปลี่ยนชื่อ
    confirmRenameButton.addEventListener('click', () => {
        const newName = newProjectNameInput.value.trim();
        if (newName && selectedProject) {
            const nameElement = selectedProject.querySelector('.project-name');
            nameElement.textContent = newName;
            renameProjectModal.style.display = 'none';
            newProjectNameInput.value = '';
        } else {
            alert('กรุณากรอกชื่อโปรเจค');
        }
    });

    document.getElementById('downloadOption').addEventListener('click', () => {
        if (selectedProject) {
            alert('ดาวน์โหลดโปรเจค: ' + selectedProject.querySelector('.project-name').textContent);
            // เพิ่มโค้ดสำหรับการดาวน์โหลดที่นี่
        }
    });

    document.getElementById('deleteOption').addEventListener('click', () => {
        if (selectedProject) {
            const projectName = selectedProject.querySelector('.project-name').textContent;
            deleteProjectModal.querySelector('h2').textContent = projectName;
            deleteProjectModal.style.display = 'flex';
            contextMenu.style.display = 'none';
        }
    });

    // ปิด Delete Modal เมื่อคลิกปุ่ม cancel
    cancelDeleteButton.addEventListener('click', () => {
        deleteProjectModal.style.display = 'none';
    });

    // ยืนยันการลบ
    confirmDeleteButton.addEventListener('click', () => {
        if (selectedProject) {
            selectedProject.remove();
            projects = projects.filter(p => p !== selectedProject);
            deleteProjectModal.style.display = 'none';
        }
    });

    // ฟังก์ชันสร้างโปรเจคใหม่
    function createProject(name) {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';

        // สร้างไอคอนโฟลเดอร์
        const icon = document.createElement('img');
        icon.className = 'project-icon';
        icon.src = 'pic/folder.png';
        icon.alt = 'Folder Icon';

        // สร้างชื่อโปรเจค
        const nameElement = document.createElement('div');
        nameElement.className = 'project-name';
        nameElement.textContent = name;

        // เพิ่มองค์ประกอบลงในการ์ด
        projectCard.appendChild(icon);
        projectCard.appendChild(nameElement);

        // เพิ่มการ์ดลงในกริดต่อท้าย
        projectsGrid.appendChild(projectCard);
        projects.push(projectCard);
    }
}); 