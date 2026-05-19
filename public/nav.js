async function initNav() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("/api/auth/perfil", { headers: { "Authorization": `Bearer ${token}` } });
    const user = await res.json();

    // Mostrar link admin si es administrador
    const linkAdmin = document.getElementById("link-admin");
    if (linkAdmin && user.rol === "administrador") linkAdmin.style.display = "inline";

    // Reemplazar el avatar en el nav
    const avatarContainer = document.getElementById("nav-avatar-container");
    if (!avatarContainer) return;

    const avatarHtml = user.foto_perfil
        ? `<img src="${user.foto_perfil}" class="nav-avatar" onclick="toggleNavDropdown()">`
        : `<div class="nav-avatar-placeholder" onclick="toggleNavDropdown()">👤</div>`;

    avatarContainer.innerHTML = `
        <div class="nav-avatar-btn">
            ${avatarHtml}
            <div class="nav-dropdown" id="nav-dropdown">
		<a href="suscripciones">⭐ Suscripción</a>
                <a href="perfil">👤 Ver perfil</a>
                <a href="tienda">🛍️ Tienda</a>
		<a href="mis-pedidos">📋 Mis pedidos</a>
		<a href="#" onclick="logoutNav()">🚪 Cerrar sesión</a>
            </div>
        </div>
    `;

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener("click", (e) => {
        if (!avatarContainer.contains(e.target)) {
            document.getElementById("nav-dropdown")?.classList.remove("visible");
        }
    });
}

function toggleNavDropdown() {
    document.getElementById("nav-dropdown")?.classList.toggle("visible");
}

function logoutNav() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}
