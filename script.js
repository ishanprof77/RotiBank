function showPortal(portalId) {
    const portals = document.querySelectorAll('.portal');
    portals.forEach(portal => portal.classList.add('hidden'));
    document.getElementById(portalId).classList.remove('hidden');
}

document.getElementById('restaurantForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Restaurant data submitted!');
});

document.getElementById('volunteerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Volunteer registered!');
});

document.getElementById('ngoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('NGO registered!');
});
