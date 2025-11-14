function AboutMe({ user }) {
  user.role = user.role.toLowerCase();
  return (
    <div className="about-me px-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>About me</h2>
        <a href={`/${user.role}/profile/edit`} className="btn btn-outline-secondary rounded-pill px-4">
          Edit
        </a>
      </div>

      <div className="card p-4 d-flex align-items-center flex-sm-row gap-3" style={{ borderRadius: "12px" }}>
        {user.avatar_url ? (
           <img src={/^https?:\/\//i.test(user.avatar_url) ? user.avatar_url  : `http://localhost:4000${user.avatar_url}`} alt="avatar" className="item-icon rounded-circle" style={{ width: 40, height: 40, objectFit: "cover" }} />
           ) : ( <span className="item-icon rounded-circle bg-dark text-white"> {(user.first_name?.[0] || "?").toUpperCase()} </span>
           )}
        <div>
          <h4 className="mb-0">{user.first_name}</h4>
          <p className="text-muted mb-0">Guest</p>
        </div>
      </div>
    </div>
  );
}

export default AboutMe;