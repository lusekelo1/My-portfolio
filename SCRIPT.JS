// ============================================
// MY PORTFOLIO — script.js
// Scroll-reveal animations for h2 sections
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Select all section headings and the content right after them
  const sections = document.querySelectorAll("h2");

  // Options for the observer: trigger when 15% of the element is visible
  const observerOptions = {
    threshold: 0.15
  };

  // Create the observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        // Stop watching once it's shown (animation only plays once)
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Watch each h2 (and the paragraph right after it, if there is one)
  sections.forEach((heading) => {
    heading.classList.add("fade-section");
    observer.observe(heading);

    const nextEl = heading.nextElementSibling;
    if (nextEl && nextEl.tagName === "P") {
      nextEl.classList.add("fade-section");
      observer.observe(nextEl);
    }
  });

  // ============================================
  // Contact form submission
  // ============================================
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // stop the page from reloading

      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const message = document.getElementById("message").value;
      const recaptchaToken = grecaptcha.getResponse();

      if (!recaptchaToken) {
        formStatus.textContent = "Please complete the reCAPTCHA.";
        return;
      }

      formStatus.textContent = "Sending...";

      try {
        const response = await fetch("/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, message, recaptchaToken })
        });

        const data = await response.json();

        if (response.ok) {
          formStatus.textContent = data.success;
          contactForm.reset(); // clear the form
          grecaptcha.reset(); // reset the checkbox for next time
        } else {
          formStatus.textContent = data.error || "Something went wrong.";
          grecaptcha.reset();
        }
      } catch (error) {
        formStatus.textContent = "Could not send message. Please try again.";
        console.error(error);
        grecaptcha.reset();
      }
    });
  }

  // ============================================
  // Load projects dynamically
  // ============================================
  const projectsList = document.getElementById("projectsList");

  if (projectsList) {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((projects) => {
        projectsList.innerHTML = ""; // clear whatever was there
        projects.forEach((project) => {
          const li = document.createElement("li");
          li.innerHTML = `<strong>${project.name}</strong> — ${project.description}`;
          projectsList.appendChild(li);
        });
      })
      .catch((error) => {
        console.error("Could not load projects:", error);
      });
  }
});