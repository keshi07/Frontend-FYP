async function loadCurrentProfile(expectedRole) {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData.user) {
    window.location.href = "login.html";
    return null;
  }

  const user = authData.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  if (expectedRole && profile.role !== expectedRole) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return profile;
}

async function guardDashboard(expectedRole, roleLabel) {
  const profile = await loadCurrentProfile(expectedRole);
  if (!profile) return;

  const nameEl = document.getElementById("displayName");
  const roleEl = document.getElementById("displayRole");

  if (nameEl) nameEl.textContent = profile.full_name;
  if (roleEl) roleEl.textContent = roleLabel;
}