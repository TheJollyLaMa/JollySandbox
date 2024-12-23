document.getElementById("signingBonusBtn").addEventListener("click", async () => {
    const response = await fetch('/claim-signing-bonus', { method: 'POST' });
    alert(await response.text());
});

document.getElementById("recruitmentBtn").addEventListener("click", async () => {
    const students = prompt("Enter the number of students recruited:");
    const response = await fetch('/record-recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
    });
    alert(await response.text());
});

document.getElementById("classCompletionBtn").addEventListener("click", async () => {
    const attendees = prompt("Enter the number of attendees:");
    const response = await fetch('/record-class-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendees }),
    });
    alert(await response.text());
});

document.getElementById("engagementBonusBtn").addEventListener("click", async () => {
    const students = prompt("Enter the number of engaged students:");
    const response = await fetch('/record-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
    });
    alert(await response.text());
});

document.getElementById("completionEngagementBonusBtn").addEventListener("click", async () => {
    const response = await fetch('/claim-completion-bonus', { method: 'POST' });
    alert(await response.text());
});

document.getElementById("finalCompletionBtn").addEventListener("click", async () => {
    const response = await fetch('/claim-final-completion', { method: 'POST' });
    alert(await response.text());
});