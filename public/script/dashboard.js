const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");
const msgerTitle = get(".msger-header-title");
const tel = get(".tel").textContent;
const email = get(".email").textContent;
const openModal = get("#openModal");
const modal = get(".modal");
const contacts = document.querySelectorAll("a.list-group-item.list-group-item-action");
const listContacts = get(".list-group.list-group-flush");
const sidebar = get("#sidebar");
const toggleSidebar = get("#toggleSidebar");
const toggleSidebar2 = get("#toggleSidebar2");
const contactModalForm = get("#contactModalForm");
const contactName = get("#contactName");
const contactTel = get("#contactTel");
let counter = 0;

//Include Websocket
const socket = io("http://localhost:4200", { query: { tel, email } });

toggleSidebar.addEventListener("click", (e) => {
  e.preventDefault();
  counter++;
  toggleSideBar();

  let arrow = "";
  setInterval(() => {
    if (sidebar.classList.contains("active-nav")) {
      toggleSidebar.innerHTML -= `Sidebar ${arrow}`;
      arrow = "&xlarr;";
      toggleSidebar.innerHTML += `Sidebar ${arrow}`;
      toggleSidebar.innerHTML = toggleSidebar.textContent.slice(3);
    } else {
      toggleSidebar.innerHTML -= `Sidebar ${arrow}`;
      arrow = "&xrarr;";
      toggleSidebar.innerHTML += `Sidebar ${arrow}`;
      toggleSidebar.innerHTML = toggleSidebar.textContent.slice(3);
    }
  }, 10);
});

toggleSidebar2.addEventListener("click", (e) => {
  e.preventDefault();
  counter++;
  toggleSideBar();

  let arrow = "";
  setInterval(() => {
    if (sidebar.classList.contains("active-nav")) {
      toggleSidebar2.innerHTML -= `Sidebar ${arrow}`;
      arrow = "&xlarr;";
      toggleSidebar2.innerHTML += `Sidebar ${arrow}`;
      toggleSidebar2.innerHTML = toggleSidebar2.textContent.slice(-1);
    } else {
      toggleSidebar2.innerHTML -= `Sidebar ${arrow}`;
      arrow = "&xrarr;";
      toggleSidebar2.innerHTML += `Sidebar ${arrow}`;
      toggleSidebar2.innerHTML = toggleSidebar2.textContent.slice(-1);
    }
  }, 10);
});

setInterval(() => {
  if (!counter) {
    if (window.innerWidth > 768) {
      sidebar.classList.add("active-nav");
    } else {
      sidebar.classList.remove("active-nav");
    }
  }
}, 10);

function toggleSideBar() {
  sidebar.classList.toggle("active-nav");
}

//Open contact modal on click
const myModal = new bootstrap.Modal("#contactModal", {
  keyboard: false,
  backdrop: "static",
});
openModal.addEventListener("click", () => {
  contactName.value = "";
  contactTel.value = "";
  myModal.show(get("#contactModal"));
});

//Display contacts
socket.on("saved-contacts", (cts) => {
  cts.forEach((contact) => {
    let conactPrivateRoom = contact.contactTel + tel;
    let roomPrivate = tel + contact.contactTel;
    let btn = document.createElement("a");
    btn.classList.add("list-group-item");
    btn.classList.add("list-group-item-action");
    btn.setAttribute("data-text", contact.contactName);
    btn.setAttribute("style", "text-decoration: none; cursor:pointer;");
    btn.addEventListener("click", () => {
      socket.emit("join", conactPrivateRoom);
      socket.emit("join", roomPrivate);
    });
    btn.innerHTML = `${contact.contactName}<span style="display: none;">${contact.contactTel}</span>`;

    listContacts.appendChild(btn);
  });
});

//Add listener on each btn/contact
contacts.forEach((contact) => {
  contact.addEventListener("click", (event) => {
    event.preventDefault();
    let contactPrivateRoom = contact;
    let roomPrivate = "";
    let count = 0;
    if (!contact.classList.contains("active")) {
      contacts.forEach((con) => con.classList.remove("active"));
      contact.classList.add("active");
      socket.emit("join", contactPrivateRoom, roomPrivate);
      console.log(contactPrivateRoom, roomPrivate);
    } else {
      contacts.forEach((con) => {
        if (con.classList.contains("active")) {
          count++;
        }
      });
      if (!count) {
        contact.classList.remove("active");
      }
    }
  });
});

contacts.forEach((con) => {
  con.addEventListener("click", (event) => {
    event.preventDefault();
    if (con.classList.contains("active")) {
      //
    }
  });
});

//Add new contact from modal form
let newContactArray;
contactModalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  newContactArray = {
    contactName: contactName.value,
    contactTel: contactTel.value,
  };
  socket.emit("new-contact", newContactArray, tel);
  myModal.hide();
});

// Names in Chat
const BOT_NAME = "BOT";
const personName = get("div.msger-header-options > span.lead").textContent;

msgerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const msgText = msgerInput.value;
  if (!msgText) return;

  sendMessage(tel, msgText);
  msgerInput.value = "";
});

socket.on("connect", () => console.log(socket.id, tel, window.innerWidth));

socket.on("receive-message", ({ name, message }) => {
  receiveMessage(message, name);
});

function sendMessage(recipients, message) {
  //   Simple solution for small apps
  const msgHTML = `
    <div class="msg right-msg">
      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">You</div>
          <div class="msg-info-time">${formatDate(
            new Date()
          )}&nbsp;&nbsp;<span>Read</span></div>
        </div>
        <div class="msg-text">${message}</div>
      </div>
    </div>
  `;

  socket.emit("send-message", {
    message: message,
    recipients,
  });

  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop = msgerChat.scrollHeight;
}

// Utils
function get(selector, root = document) {
  return root.querySelector(selector);
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  return `${h.slice(-2)}:${m.slice(-2)}`;
}

function receiveMessage(message, name) {
  let msgDisplay = `<div class="msg right-msg">
  <div class="msg-bubble">
    <div class="msg-info">
      <div class="msg-info-name">${name}</div>
      <div class="msg-info-time">${formatDate(
        new Date()
      )}&nbsp;&nbsp;<span>Read</span></div>
    </div>
    <div class="msg-text">
      ${message}
    </div>
  </div>
</div>`;

  msgerChat.insertAdjacentHTML("beforeend", msgDisplay);
  msgerChat.scrollTop = msgerChat.scrollHeight;
}