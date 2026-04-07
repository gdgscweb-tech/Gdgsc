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
          photo: "images/meetteam/Office Bearers/Chairman/Vedaant (president).jpg",
        },
        {
          name: "Mohammad",
          role: "Vice-Chairman",
          linkedin: "#",
          github: "#",
          instagram: "#",
          photo: "images/meetteam/Office Bearers/Vice-Chairman/Mohammad.jpg",
        },
        {
          name: "Prarthna",
          role: "General Secretary",
          linkedin: "https://www.linkedin.com/in/nishant-38aa9b24b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
          instagram: "https://www.instagram.com/_nishant__cifrado?igsh=YzVwdWg2em0ycGQw",
          github: "https://github.com/Frenzy16327",
          photo: "images/meetteam/Office Bearers/General Secretary/Prarthna (treasurer).jpg",
        },
        {
          name: "Yash Tohan",
          role: "Joint Secretary",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Office Bearers/Joint Secretary/Yash Tohan.png",
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
          photo:"images/meetteam/Office Bearers/Chairman/vedaant (president).jpg",
        },
        {
          name: "Kavya Sharma",
          role: "3D Design",
          linkedin: "https://in.linkedin.com/in/kavya-sharma-6b42ba291",
          instagram: "https://www.instagram.com/sharma6814kavya?igsh=bTB6cGhvOTJwZHd3",
          github: "https://github.com/Kavya6814",
          photo:"images/meetteam/Team Blender/KavyaSharma1.jpg",
        },
        {
          name: "Simant Pandit",
          role: "Game Dev",
          linkedin: "https://www.linkedin.com/in/simant-pandit-634a13312",
          instagram: "https://www.instagram.com/simant._pandit/",
          github: "https://github.com/Patagobhi",
          photo:"images/meetteam/Team Unreal/Simant Pandit1.jpg",
        },
        {
          name: "Shubham Singh",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "https://github.com/Shubhamkira10",
          photo:"images/meetteam/Team Unreal/Shubham1.jpg",
        },
        {
          name: "Prashant Baliyan",
          role: "PR",
          linkedin: "#",
          instagram: "https://www.instagram.com/p.baliyan_?igsh=Nng2cWV3NjE1MzV4",
          github: "#",
          photo:"images/meetteam/Team Outreach/prashant.jpg",
        },
        {
          name: "Aditya Singh",
          role: "Design",
          linkedin: "https://www.linkedin.com/in/its-adityasingh/",
          instagram: "https://www.instagram.com/k_aditya_singh/",
          github: "https://github.com/its-adityasingh",
          photo:"images/meetteam/Team Prototype/Aditya Singh.jpeg",
        },
        {
          name: "Dev Nath",
          role: "Design",
          linkedin: "https://www.linkedin.com/in/dev-nath-1093a432a?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
          instagram: "https://www.instagram.com/nuke.psd?igsh=YTYzbWNiN2FwenNz",
          github: "#",
          photo:"images/meetteam/Team Prototype/Dev Nath (1).jpg",
        },
        {
          name: "Raghav Gupta",
          role: "Events",
          linkedin: "https://www.linkedin.com/in/raghav-gupta-bb4757323/",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/RG.png",
        },
        
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
          photo:"images/meetteam/Team Unreal/Aryan kumar (Team Unreal).jpg",
        },
        {
          name: "Krrish Gupta",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Krrish Gupta (Team Unreal).jpg",
        },
        {
          name: "Pragyank Sinha",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Pragyank.png",
        },
        {
          name: "Shubh",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Shubh.jpeg",
        },
        {
          name: "Tushar",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Tushar-_-.jpg",
        },
        {
          name: "Simant Pandit",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Simant Pandit1.jpg",
        },
        {
          name: "Shubham",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Shubham1.jpg",
        },
        {
          name: "Vichitra Verma",
          role: "Game Dev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Unreal/Vichitra Verma (Team Unreal).jpg",
        },
        {
          name: "Navneet Guglani",
          role: "Game Dev",
          linkedin: "https://www.linkedin.com/in/navneet-guglani-1192b9291?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
          instagram: "https://www.instagram.com/navneet_guglani?igsh=MWNtdGNxNHhzaGVvcQ==",
          github: "https://github.com/Navneet1710",
          photo:"images/meetteam/Team Unreal/Navneet_.jpg",
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
          photo:"images/meetteam/Team Blender/Saksham.jpg",
        },
        {
          name: "Aditya Bhatnagar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Aditya Bhatnagar (Team Blender).jpg",
        },
        {
          name: "Aryan Shekhar Vats",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Aryan Shekhar Vats(Team Blender).jpg",
        },
        {
          name: "Dev Dhir",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Dev.png",
        },
        {
          name: "Dhruv Vashishth",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Dhruv Vashishth final.jpg",
        },
        {
          name: "Kavya Sharma",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/KavyaSharma1.jpg",
        },
        {
          name: "Lalit Kumar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Lalit Kumar (Team Blender).jpg",
        },
        {
          name: "Mohit Kumar",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Mohit Kumar (blender).jpg",
        },
        {
          name: "Ved Prakash Sharma",
          role: "3D Design",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Blender/Ved Prakash Sharma (Team Blender).jpg",
        },
        {
          name: "Raghav Bhatia",
          role: "3D Design",
          linkedin: "https://www.linkedin.com/in/raghav-bhatia-775854214/",
          instagram: "https://www.instagram.com/raghavbhatia.23/?hl=en",
          github: "https://github.com/raghav-2310",
          photo:"images/meetteam/Team Blender/Raghav Bhatia.jpeg",
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
          photo:"images/meetteam/Team Overwatch/anmol (overwatch).jpg",
        },
        {
          name: "AYUSHI SINGH",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/AYUSHI_SINGH(OVERWATCH).jpg",
        },
        {
          name: "Ayush Joshi",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/AYUSHJOSHI(OVERWATCH).jpg",
        },
        {
          name: "Billy",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/Billy.jpg",
        },
        {
          name: "Love Kumar",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/Love kumar (OVERWATCH).jpg",
        },
        {
          name: "Piyush Rana",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/PIYUSH RANA(OVERWATCH).jpg",
        },
        {
          name: "Satyam",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/Satyam.png",
        },
        {
          name: "Swayam Kumar Gupta",
          role: "Events",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Overwatch/swayam kumar gupta (team overwatch).jpg",
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
          photo:"images/meetteam/Team Outreach/Avani .jpg",
        },
        {
          name: "Divyanshu Choubey",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Divyanshu Choubey(Outreach).jpeg",
        },
        {
          name: "Harshita",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Harshita (outreach).jpg",
        },
        {
          name: "Prateek Rathee",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Prateek Rathee .jpg",
        },
        {
          name: "Prisha",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Prisha.jpg",
        },
        {
          name: "Ridima Goyal",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Ridima Goyal( Team Outreach ).jpg",
        },
        {
          name: "Sanvi",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Sanvi ( Outreach ).jpg",
        },
        {
          name: "Shraddha",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Shraddha.jpg",
        },
        {
          name: "Shubham",
          role: "PR",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team Outreach/Shubham (outreach).jpg",
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
          photo:"images/meetteam/Team catalyst_/Adarsh (Team catalyst).jpg",
        },
        {
          name: "Garvit",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/Garvit.png",
        },
        {
          name: "Mayank Bisht",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/Mayank Bisht(team catalyst).jpg",
        },
        {
          name: "Ojus Mathur",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/OJUS MATHUR (Team Catalyst).jpeg",
        },
        {
          name: "Ujjwal",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/Ujjwal_Team-Catalyst.jpg",
        },
        {
          name: "Vaibhav Rastogi",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/Vaibhav Rastogi Catalyst.jpg",
        },
        {
          name: "Vansh Johri",
          role: "Research",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo:"images/meetteam/Team catalyst_/Vansh johri team catalyst .jpg",
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
          photo: "images/meetteam/Team scratch_/Himanshu Tiwari (Team Scratch).jpg",
        },
        {
          name: "Arihant Jain",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team scratch_/Arihant.jpg",
        },
        {
          name: "Utkarsh Sharma",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team scratch_/Utkarshh.jpg",
        },
        {
          name: "Tanmay",
          role: "WebDev",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team scratch_/tanmay(Team Scratch).JPG",
        },
        {
          name: "Rishit Kadha",
          role: "WebDev",
          linkedin: "#",
          instagram: "https://www.instagram.com/rishit_kadha_?igsh=eGl3ZWw0cGx2ZWty",
          github: "https://github.com/rishit-kadha",
          photo:"images/meetteam/Team scratch_/Rishit_Kadha1.jpg",
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
          photo: "images/meetteam/Team Prototype/CHIRAG MALVIYA.jpg",
        },
        {
          name: "Dev Nath",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/Dev Nath (1).jpg",
        },
        {
          name: "Ishant Aggarwal",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/ISHANT AGGARWAL .png",
        },
        {
          name: "Kashvi",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/Kashvi(team prototype).jpg",
        },
        {
          name: "Rashmaya Vaidya",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/Rashmaya Vaidya.jpg",
        },
        {
          name: "Sambhav",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/sambhav1.jpg",
        },
        {
          name: "Shashwat Shivam",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Prototype/Shashwat Shivam.jpg",
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
          photo: "images/meetteam/Team Theft/Ashi.png",
        },
        {
          name: "Gandharv",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Theft/Gandharv (Theft).jpg",
        },
        {
          name: "Junaid",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Theft/Junaid(theft) .jpg",
        },
        {
          name: "Pooja",
          role: "Theft",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Theft/Pooja( theft).JPG",
        },
        {
          name: "Shivank Verma",
          role: "Prototyping",
          linkedin: "#",
          instagram: "#",
          github: "#",
          photo: "images/meetteam/Team Theft/Shivank Verma(Team Theft).png",
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
                        onerror="this.onerror=null; this.src='images/meetteam/fallback-image.jpg';"
                        alt={member.name}
                        className="member-image"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/300";
                        }}
                      />:
                      <img
                        src="images/meetteam/fallback-image.jpg"
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
