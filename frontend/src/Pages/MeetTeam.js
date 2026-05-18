import React from "react";
import "./MeetTeam.css";
import { FaLinkedin, FaInstagram, FaGithub } from "react-icons/fa";

const MeetTeam = () => {
  const teams = [
    {
      name: "Office Bearers",
      color: "team-gold",
      members: [
        {
          name: "Vedaant Budakoti",
          role: "Chairman",
          linkedin: "https://www.linkedin.com/in/vedaantbudakoti/",
          instagram: "https://www.instagram.com/vedaant._.vbd/",
          github: "https://github.com/Vedaant-VBD",
          photo: "/images/meetteam/OfficeBearers/Chairman/vedaant(president).jpg",
        },
        {
          name: "Mohammad",
          role: "Vice-Chairman",
          linkedin: "#",
          github: "#",
          instagram: "#",
          photo: "/images/meetteam/OfficeBearers/Vice-Chairman/Mohammad.jpg",
        },
        {
          name: "Prarthna",
          role: "General Secretary",
          linkedin: "https://www.linkedin.com/in/nishant-38aa9b24b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
          instagram: "https://www.instagram.com/_nishant__cifrado?igsh=YzVwdWg2em0ycGQw",
          github: "https://github.com/Frenzy16327",
          photo: "/images/meetteam/OfficeBearers/GeneralSecretary/Prarthna(treasurer).jpg",
        },
        {
          name: "Yash Tohan",
          role: "Joint Secretary",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/OfficeBearers/JointSecretary/YashTohan.png",
        },
      ],
    },
    {
      name: "Core Team",
      color: "team-white",
      members: [
         {
          name: "Vedaant Budakoti",
          role: "Game Dev",
          linkedin: "https://www.linkedin.com/in/vedaantbudakoti/",
          instagram: "https://www.instagram.com/vedaant._.vbd/",
          github: "https://github.com/Vedaant-VBD",
          photo: "/images/meetteam/OfficeBearers/Chairman/vedaant(president).jpg",
        },
        {
          name: "Kavya Sharma",
          role: "3D Design",
          linkedin: "https://in.linkedin.com/in/kavya-sharma-6b42ba291",
          instagram: "https://www.instagram.com/sharma6814kavya?igsh=bTB6cGhvOTJwZHd3",
          github: "https://github.com/Kavya6814",
          photo: "/images/meetteam/TeamBlender/KavyaSharma1.jpg",
        },
        {
          name: "Simant Pandit",
          role: "Game Dev",
          linkedin: "https://www.linkedin.com/in/simant-pandit-634a13312",
          instagram: "https://www.instagram.com/simant._pandit/",
          github: "https://github.com/Patagobhi",
          photo: "/images/meetteam/TeamUnreal/SimantPandit1.jpg",
        },
        {
          name: "Shubham Singh",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "https://github.com/Shubhamkira10",
          photo: "/images/meetteam/TeamUnreal/Shubham1.jpg",
        }
        
      ],
    },
    {
      name: "Team Unreal",
      color: "team-red",
      members: [
       
        {
          name: "Aryan Kumar",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/Aryankumar(TeamUnreal).jpg",
        },
        {
          name: "Krrish Gupta",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/KrrishGupta(TeamUnreal).jpg",
        },
        {
          name: "Pragyank Sinha",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/Pragyank.png",
        },
        {
          name: "Shubh",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/Shubh.jpeg",
        },
        {
          name: "Tushar",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/Tushar-_-.jpg",
        },
        {
          name: "Simant Pandit",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/SimantPandit1.jpg",
        },
        {
          name: "Shubham",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/Shubham1.jpg",
        },
        {
          name: "Vichitra Verma",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamUnreal/VichitraVerma(TeamUnreal).jpg",
        },
        {
          name: "Navneet Guglani",
          role: "Game Dev",
          linkedin: "https://www.linkedin.com/in/navneet-guglani-1192b9291?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
          instagram: "https://www.instagram.com/navneet_guglani?igsh=MWNtdGNxNHhzaGVvcQ==",
          github: "https://github.com/Navneet1710",
          photo: "/images/meetteam/TeamUnreal/Navneet_.jpg",
        },
        
      ],
    },
    {
      name: "Team Blender",
      color: "team-green",
      members: [
        
        {
          name: "Saksham Aggarwal",
          role: "3D Design",
          linkedin: "https://www.linkedin.com/in/saksham-kumar-aggarwal-769bb8308",
          instagram: "https://www.instagram.com/m1551ngn0?igsh=MW1jYjBzaWYyZ3UzMQ==",
          github: "https://github.com/M1ss1ngN0",
          photo: "/images/meetteam/TeamBlender/Saksham.jpg",
        },
        {
          name: "Aditya Bhatnagar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/AdityaBhatnagar(TeamBlender).jpg",
        },
        {
          name: "Aryan Shekhar Vats",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/AryanShekharVats(TeamBlender).jpg",
        },
        {
          name: "Dev Dhir",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/Dev.png",
        },
        {
          name: "Dhruv Vashishth",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/DhruvVashishthfinal.jpg",
        },
        {
          name: "Kavya Sharma",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/KavyaSharma1.jpg",
        },
        {
          name: "Lalit Kumar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/LalitKumar(TeamBlender).jpg",
        },
        {
          name: "Mohit Kumar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/MohitKumar(blender).jpg",
        },
        {
          name: "Ved Prakash Sharma",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamBlender/VedPrakashSharma(TeamBlender).jpg",
        },
        {
          name: "Raghav Bhatia",
          role: "3D Design",
          linkedin: "https://www.linkedin.com/in/raghav-bhatia-775854214/",
          instagram: "https://www.instagram.com/raghavbhatia.23/?hl=en",
          github: "https://github.com/raghav-2310",
          photo: "/images/meetteam/TeamBlender/RaghavBhatia.jpeg",
        },
        
      ],
    },
    {
      name: "Team OverWatch",
      color: "team-cyan",
      members: [
        {
          name: "Anmol",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/anmol(overwatch).jpg",
        },
        {
          name: "AYUSHI SINGH",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/AYUSHI_SINGH(OVERWATCH).jpg",
        },
        {
          name: "Ayush Joshi",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/AYUSHJOSHI(OVERWATCH).jpg",
        },
        {
          name: "Billy",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/Billy.jpg",
        },
        {
          name: "Love Kumar",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/Lovekumar(OVERWATCH).jpg",
        },
        {
          name: "Piyush Rana",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/PIYUSHRANA(OVERWATCH).jpg",
        },
        {
          name: "Satyam",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/Satyam.png",
        },
        {
          name: "Swayam Kumar Gupta",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOverwatch/swayamkumargupta(teamoverwatch).jpg",
        },
      ],
    },
    {
      name: "Team OutReach",
      color: "team-orange",
      members: [
        
        {
          name: "Avani",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Avani.jpg",
        },
        {
          name: "Divyanshu Choubey",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/DivyanshuChoubey(Outreach).jpeg",
        },
        {
          name: "Harshita",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Harshita(outreach).jpg",
        },
        {
          name: "Prateek Rathee",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/PrateekRathee.jpg",
        },
        {
          name: "Prisha",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Prisha.jpg",
        },
        {
          name: "Ridima Goyal",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/RidimaGoyal(TeamOutreach).jpg",
        },
        {
          name: "Sanvi",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Sanvi(Outreach).jpg",
        },
        {
          name: "Shraddha",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Shraddha.jpg",
        },
        {
          name: "Shubham",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamOutreach/Shubham(outreach).jpg",
        },
      ],
    },
    {
      name: "Team Catalyst",
      color: "team-purple",
      members: [
        {
          name: "Adarsh",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/Adarsh(TeamCatalyst).jpg",
        },
        {
          name: "Garvit",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/Garvit.png",
        },
        {
          name: "Mayank Bisht",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/MayankBisht(teamcatalyst).jpg",
        },
        {
          name: "Ojus Mathur",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/OJUSMATHUR(TeamCatalyst).jpeg",
        },
        {
          name: "Ujjwal",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/Ujjwal_Team-Catalyst.jpg",
        },
        {
          name: "Vaibhav Rastogi",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/VaibhavRastogiCatalyst.jpg",
        },
        {
          name: "Vansh Johri",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamCatalyst/Vanshjohriteamcatalyst.jpg",
        },
      ],
    },
    {
      name: "Team Scratch",
      color: "team-blue",
      members: [
        {
          name: "Himanshu Tiwari",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamScratch/HimanshuTiwari(TeamScratch).jpg",
        },
        {
          name: "Arihant Jain",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamScratch/Arihant.jpg",
        },
        {
          name: "Utkarsh Sharma",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamScratch/Utkarshh.jpg",
        },
        {
          name: "Rishit Kadha",
          role: "WebDev",
          linkedin: "#",
          instagram: "https://www.instagram.com/rishit_kadha_?igsh=eGl3ZWw0cGx2ZWty",
          github: "https://github.com/rishit-kadha",
          photo: "/images/meetteam/TeamScratch/Rishit_Kadha1.jpg",
        },
      ],
    },
    {
      name : "Team Prototype",
      color : "team-pink",
      members : [
        {
          name: "Chirag Malviya",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/CHIRAGMALVIYA.jpg",
        },
        {
          name: "Ishant Aggarwal",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/ISHANTAGGARWAL.png",
        },
        {
          name: "Kashvi",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/Kashvi(teamprototype).jpg",
        },
        {
          name: "Rashmaya Vaidya",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/RashmayaVaidya.jpg",
        },
        {
          name: "Sambhav",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/sambhav1.jpg",
        },
        {
          name: "Shashwat Shivam",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamPrototype/ShashwatShivam.jpg",
        },
      ]
    },
    {
      name : "Team Theft",
      color : "team-brown",
      members : [
        {
          name: "Ashi",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamTheft/Ashi.png",
        },
        {
          name: "Gandharv",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamTheft/Gandharv(Theft).jpg",
        },
        {
          name: "Junaid",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamTheft/Junaid(theft).jpg",
        },
        {
          name: "Pooja",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamTheft/Pooja(theft).jpg",
        },
        {
          name: "Shivank Verma",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "/images/meetteam/TeamTheft/ShivankVerma(TeamTheft).png",
        },
      ]
    },
  ];

  return (
    <section className="meet-team-section">
      <div className="content-container">
        <h2 className="section-title">
          <span className="title-text">MEET OUR TEAM</span>
        </h2>
        <div className="title-underline"></div>
        <p className="section-description">
          Our expert team is made up of creatives with technical know-how,
          strategists who think outside the box, and people who push beyond
          innovation.
        </p>

        {teams.map((team, teamIndex) => (
          <div key={teamIndex} className="team-section">
            <h2 className="team-title">
              <span className="team-title-text">{team.name}</span>
              <span className="team-title-underline"></span>
            </h2>

            <div className="team-members">
              {team.members.map((member, memberIndex) => (
                <div key={memberIndex} className={`member-card ${team.color}`}>
                  <div className="member-image-container">
                    <div className="image-wrapper">
                      {member.photo !== '' ? <img
                        src={member.photo}
                        alt={member.name}
                        className="member-image"
                        onError={(e) => {
                          e.target.src = "/images/meetteam/fallback-image.jpg";
                        }}
                      />:
                      <img
                        src="/images/meetteam/fallback-image.jpg"
                        alt={member.name}
                        className="member-image"
                      />
                      }
                    </div>
                  </div>

                  <div className="member-info">
                    <h3 className="member-name">{member.name}</h3>
                    <p className="member-role">{member.role}</p>
                  </div>

                  <div className="member-social-links">
                    <a
                      href={member.linkedin}
                      className="social-link linkedin"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaLinkedin className="social-icon" />
                    </a>
                    <a
                      href={member.instagram}
                      className="social-link instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaInstagram className="social-icon" />
                    </a>
                    <a
                      href={member.github}
                      className="social-link github"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaGithub className="social-icon" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MeetTeam;
