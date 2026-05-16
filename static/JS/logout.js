async function logoutUser(event) {
  if (event) event.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = "/login";
}

function bindLogout(selectorList) {
  selectorList.forEach((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.addEventListener("click", logoutUser);
    }
  });
}