async function handleLoginSubmit(event) {
  event.preventDefault();

  const selectedRole = document.getElementById("role")?.value;
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!selectedRole || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (signInError || !signInData.user) {
    alert("Invalid login credentials.");
    return;
  }

  const user = signInData.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabaseClient.auth.signOut();
    alert("Invalid login credentials.");
    return;
  }

  if (profile.role !== selectedRole) {
    await supabaseClient.auth.signOut();
    alert("Invalid login credentials.");
    return;
  }

  if (profile.role === "admin") {
    window.location.href = "/admin-dashboard";
    return;
  }

  if (profile.role === "cso") {
    window.location.href = "/cso-dashboard";
    return;
  }

  await supabaseClient.auth.signOut();
  alert("Invalid login credentials.");
}

function bindLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", handleLoginSubmit);
}