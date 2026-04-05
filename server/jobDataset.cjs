const FAKE_JOB_DATASET = [
  {
    title: "Frontend Developer",
    description: "Builds and maintains user interfaces for web applications.",
    skills: ["HTML", "CSS", "JavaScript", "React", "Vue", "Angular"],
    goals: ["frontend", "web", "ui", "ux", "interface", "react"],
    salaryRange: "$70,000 - $120,000"
  },
  {
    title: "Backend Engineer",
    description: "Develops server-side logic, APIs, and manages databases.",
    skills: ["Node.js", "Python", "Java", "SQL", "MongoDB", "Express", "REST APIs"],
    goals: ["backend", "server", "api", "database", "infrastructure"],
    salaryRange: "$80,000 - $135,000"
  },
  {
    title: "Full Stack Developer",
    description: "Handles both client-side and server-side development.",
    skills: ["JavaScript", "React", "Node.js", "SQL", "Git", "Docker"],
    goals: ["full stack", "software engineer", "web developer", "end-to-end"],
    salaryRange: "$90,000 - $145,000"
  },
  {
    title: "Data Analyst",
    description: "Interprets data and turns it into information which can offer ways to improve a business.",
    skills: ["SQL", "Excel", "Python", "Tableau", "Power BI", "Statistics"],
    goals: ["data", "analysis", "analytics", "business intelligence", "metrics"],
    salaryRange: "$65,000 - $105,000"
  },
  {
    title: "Data Scientist",
    description: "Utilizes advanced analytics technologies, including machine learning and predictive modeling.",
    skills: ["Python", "R", "Machine Learning", "TensorFlow", "Pandas", "Scikit-Learn"],
    goals: ["data science", "machine learning", "ai", "predictive", "statistics"],
    salaryRange: "$100,000 - $160,000"
  },
  {
    title: "Machine Learning Engineer",
    description: "Designs and builds machine learning systems and models.",
    skills: ["Python", "PyTorch", "TensorFlow", "AWS", "Deep Learning", "NLPs"],
    goals: ["ml", "artificial intelligence", "deep learning", "algorithms", "ai"],
    salaryRange: "$110,000 - $170,000"
  },
  {
    title: "Product Manager",
    description: "Guides the success of a product and leads the cross-functional team that is responsible for improving it.",
    skills: ["Agile", "Scrum", "Jira", "Roadmapping", "Communication", "Data Analysis"],
    goals: ["product", "management", "strategy", "leadership", "agile"],
    salaryRange: "$95,000 - $155,000"
  },
  {
    title: "DevOps Engineer",
    description: "Introduces processes, tools, and methodologies to balance needs throughout the software development life cycle.",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform"],
    goals: ["devops", "cloud", "aws", "infrastructure", "deployment", "kubernetes"],
    salaryRange: "$105,000 - $160,000"
  },
  {
    title: "UI/UX Designer",
    description: "Gathers and evaluates user requirements, designing graphic elements and building navigation components.",
    skills: ["Figma", "Sketch", "Adobe XD", "Wireframing", "Prototyping", "User Research"],
    goals: ["design", "ui", "ux", "user experience", "interface", "figma"],
    salaryRange: "$75,000 - $125,000"
  },
  {
    title: "Mobile App Developer",
    description: "Creates software for mobile devices, such as smartphones and tablets.",
    skills: ["Swift", "Kotlin", "React Native", "Flutter", "iOS", "Android"],
    goals: ["mobile", "app", "ios", "android", "react native", "flutter"],
    salaryRange: "$80,000 - $130,000"
  },
  {
    title: "Cybersecurity Analyst",
    description: "Protects IT infrastructure, edge devices, networks, and data.",
    skills: ["Network Security", "Ethical Hacking", "Firewalls", " SIEM", "Penetration Testing"],
    goals: ["security", "cybersecurity", "hacking", "infosec", "protection"],
    salaryRange: "$90,000 - $140,000"
  }
];

function suggestJobsBasedOnGoal(goalText, userSkills = []) {
  const normalizedGoal = goalText.toLowerCase();

  // Calculate a score for each job based on goal keyword matches and skill matches
  const scoredJobs = FAKE_JOB_DATASET.map(job => {
    let score = 0;

    // Check if goal contains any of the job's target goals
    for (const kw of job.goals) {
      if (normalizedGoal.includes(kw)) {
        score += 3; // Keyword matches are weighted heavily
      }
    }

    // Check if user has skills that match the job
    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    const matchedSkills = job.skills.filter(jobSkill =>
      normalizedUserSkills.some(us => us.includes(jobSkill.toLowerCase()) || jobSkill.toLowerCase().includes(us))
    );

    score += matchedSkills.length; // 1 point per matching skill

    return {
      ...job,
      score,
      matchedSkills
    };
  });

  // Sort by score descending
  scoredJobs.sort((a, b) => b.score - a.score);

  // If no obvious matches, return some default recommendations or top general ones
  if (scoredJobs[0].score === 0) {
    return [
      { ...FAKE_JOB_DATASET[0], explanation: "A great starting point in tech.", matchedSkills: [] },
      { ...FAKE_JOB_DATASET[1], explanation: "Solid foundation for software engineering.", matchedSkills: [] },
      { ...FAKE_JOB_DATASET[2], explanation: "Versatile role for well-rounded developers.", matchedSkills: [] }
    ];
  }

  // Return top 3 matches with explanations
  return scoredJobs.slice(0, 3).map(job => {
    let explanation = `This role strongly aligns with your stated goals.`;
    if (job.matchedSkills.length > 0) {
      explanation += ` It also utilizes your skills in ${job.matchedSkills.join(', ')}.`;
    }
    return {
      title: job.title,
      description: job.description,
      skills: job.skills,
      salaryRange: job.salaryRange,
      explanation: explanation,
      matchScore: job.score
    };
  });
}

module.exports = {
  FAKE_JOB_DATASET,
  suggestJobsBasedOnGoal
};
