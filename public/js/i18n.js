// Translation data
const translations = {
    ro: {
        app_title: "Grecostil - Sistem Gestionare Comenzi",
        login_title: "Autentificare",
        username_or_email: "Nume utilizator sau Email",
        password: "Parolă",
        login_btn: "Autentificare",
        logout: "Deconectare",
        dashboard: "Panou de Control",
        projects: "Proiecte",
        history: "Istoric",
        welcome: "Bine ați venit la Sistemul de Gestionare Grecostil",
        total_projects: "Total Proiecte",
        active_orders: "Comenzi Active",
        offers_in_progress: "Oferte în Lucru",
        total_value: "Valoare Totală Estimată",
        active_projects: "Proiecte Active",
        add_project: "Adaugă Proiect",
        project_name: "Nume Proiect",
        client: "Client",
        status: "Status",
        estimated_value: "Valoare Estimată",
        create: "Creează",
        cancel: "Anulează",
        edit: "Editează",
        delete: "Șterge",
        save: "Salvează",
        orders: "Comenzi",
        offers: "Oferte",
        add_order: "Adaugă Comandă",
        material_name: "Nume Material",
        quantity: "Cantitate",
        unit: "Unitate Măsură",
        unit_price: "Preț Unitar",
        order_date: "Data Comenzii",
        total: "Total",
        offer_number: "Număr Ofertă",
        offer_status: "Status Ofertă",
        in_progress: "În Lucru",
        transmitted: "Transmisă",
        approved: "Aprobată",
        rejected: "Respinsă",
        export_pdf: "Exportă PDF",
        search: "Căutare",
        filter: "Filtrare",
        date: "Dată",
        action: "Acțiune",
        details: "Detalii",
        success: "Succes!",
        error: "Eroare!",
        project_created: "Proiect creat cu succes",
        order_added: "Comandă adăugată cu succes",
        offer_created: "Ofertă creată cu succes"
    },
    en: {
        app_title: "Grecostil - Order Management System",
        login_title: "Login",
        username_or_email: "Username or Email",
        password: "Password",
        login_btn: "Login",
        logout: "Logout",
        dashboard: "Dashboard",
        projects: "Projects",
        history: "History",
        welcome: "Welcome to Grecostil Management System",
        total_projects: "Total Projects",
        active_orders: "Active Orders",
        offers_in_progress: "Offers in Progress",
        total_value: "Total Estimated Value",
        active_projects: "Active Projects",
        add_project: "Add Project",
        project_name: "Project Name",
        client: "Client",
        status: "Status",
        estimated_value: "Estimated Value",
        create: "Create",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        orders: "Orders",
        offers: "Offers",
        add_order: "Add Order",
        material_name: "Material Name",
        quantity: "Quantity",
        unit: "Unit",
        unit_price: "Unit Price",
        order_date: "Order Date",
        total: "Total",
        offer_number: "Offer Number",
        offer_status: "Offer Status",
        in_progress: "In Progress",
        transmitted: "Transmitted",
        approved: "Approved",
        rejected: "Rejected",
        export_pdf: "Export PDF",
        search: "Search",
        filter: "Filter",
        date: "Date",
        action: "Action",
        details: "Details",
        success: "Success!",
        error: "Error!",
        project_created: "Project created successfully",
        order_added: "Order added successfully",
        offer_created: "Offer created successfully"
    },
    ru: {
        app_title: "Grecostil - Система управления заказами",
        login_title: "Вход",
        username_or_email: "Имя пользователя или Email",
        password: "Пароль",
        login_btn: "Войти",
        logout: "Выйти",
        dashboard: "Панель управления",
        projects: "Проекты",
        history: "История",
        welcome: "Добро пожаловать в систему управления Grecostil",
        total_projects: "Всего проектов",
        active_orders: "Активные заказы",
        offers_in_progress: "Предложения в работе",
        total_value: "Общая estimated стоимость",
        active_projects: "Активные проекты",
        add_project: "Добавить проект",
        project_name: "Название проекта",
        client: "Клиент",
        status: "Статус",
        estimated_value: "Estimated стоимость",
        create: "Создать",
        cancel: "Отмена",
        edit: "Редактировать",
        delete: "Удалить",
        save: "Сохранить",
        orders: "Заказы",
        offers: "Предложения",
        add_order: "Добавить заказ",
        material_name: "Название материала",
        quantity: "Количество",
        unit: "Единица измерения",
        unit_price: "Цена за единицу",
        order_date: "Дата заказа",
        total: "Итого",
        offer_number: "Номер предложения",
        offer_status: "Статус предложения",
        in_progress: "В работе",
        transmitted: "Отправлено",
        approved: "Утверждено",
        rejected: "Отклонено",
        export_pdf: "Экспорт в PDF",
        search: "Поиск",
        filter: "Фильтр",
        date: "Дата",
        action: "Действие",
        details: "Детали",
        success: "Успех!",
        error: "Ошибка!",
        project_created: "Проект успешно создан",
        order_added: "Заказ успешно добавлен",
        offer_created: "Предложение успешно создано"
    }
};

let currentLanguage = localStorage.getItem('language') || 'ro';

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    translatePage();
}

function translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLanguage][key]) {
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translations[currentLanguage][key];
            } else {
                element.textContent = translations[currentLanguage][key];
            }
        }
    });
}

function t(key) {
    return translations[currentLanguage][key] || key;
}

// Auto-translate on page load
document.addEventListener('DOMContentLoaded', () => {
    translatePage();
});