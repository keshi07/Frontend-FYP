async function loadCurrentProfile(expectedRole) {
  const { data: authData, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !authData.user) {
    window.location.href = "/login";
    return null;
  }

  const user = authData.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile fetch error:", profileError);
    await supabaseClient.auth.signOut();
    window.location.href = "/login";
    return null;
  }

  if (expectedRole && profile.role !== expectedRole) {
    await supabaseClient.auth.signOut();
    window.location.href = "/login";
    return null;
  }

  return profile;
}

async function guardDashboard(expectedRole, roleLabel) {
  const profile = await loadCurrentProfile(expectedRole);
  if (!profile) return;

  const nameEl = document.getElementById("displayName");
  const roleEl = document.getElementById("displayRole");

  if (nameEl) nameEl.textContent = profile.full_name || "Staff User";
  if (roleEl) roleEl.textContent = roleLabel;
}