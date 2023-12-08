$(`#uploadPhotoButton`).on(`click`, () => {
  const a = document.createElement(`input`);
  a.type = `file`;
  a.accept = `image/*`;
  a.onchange = (e) => {
    const file = e.target.files[0];

    // Upload to 

  };
  a.click();
})