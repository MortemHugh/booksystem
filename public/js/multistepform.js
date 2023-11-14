/*var current = 0;
var tabs = $(".tab");
var tabs_pill = $(".tab-pills");

loadFormData(current);

function loadFormData(n) {
  $(tabs_pill[n]).addClass("active");
  $(tabs[n]).removeClass("d-none");
  $("#back_button").attr("disabled", n == 0 ? true : false);
  n == tabs.length - 1
    ? $("#next_button").text("").removeAttr("onclick")
    : $("#next_button")
        .attr("type", "button")
        .text("Next")
        .attr("onclick", "next()");
}

function next() {
  // Find all required inputs in the current tab
  var inputs = $(tabs[current]).find('input,select,textarea').not('[type="hidden"],[name="promocode"]');
  var isValid = true;

  // Check if all required fields are filled
  inputs.each(function() {
    if (!$(this).val()) {
      isValid = false;
      alert('Please fill all required fields');
      $(this).addClass("is-invalid");
      return false;
    }
  });

  // Additional check for the Stay Details tab
  if (isValid && current == 0) {
    var urlParams = new URLSearchParams(window.location.search);
    var typeid = urlParams.get('typeid');
    var adultno = parseInt($('#adultno').val());
    var childno = parseInt($('#childno').val());

    $.get('/reservation?typeid=' + typeid, function (data) {
      var capacity = data.capacity;
      if (adultno + childno > capacity) {
        isValid = false;
        alert('The total number of adults and children should not exceed the room capacity');
      }

      // If all checks pass, proceed to the next tab
      if (isValid) {
        $(tabs[current]).addClass('d-none');
        $(tabs_pill[current]).removeClass('active');

        current++;
        loadFormData(current);
      }
    });
  } else if (isValid) {
    // If all checks pass, proceed to the next tab
    $(tabs[current]).addClass('d-none');
    $(tabs_pill[current]).removeClass('active');

    current++;
    loadFormData(current);
  }
}

function back() {
  $(tabs[current]).addClass("d-none");
  $(tabs_pill[current]).removeClass("active");

  current--;
  loadFormData(current);
}*/

var current = 0;
var tabs = $(".tab");
var tabs_pill = $(".tab-pills");

loadFormData(current);

function loadFormData(n) {
  $(tabs_pill[n]).addClass("active");
  $(tabs[n]).removeClass("d-none");
  $("#back_button").attr("disabled", n == 0 ? true : false);
  if (n == tabs.length - 1) {
    $("#next_button").text("").removeAttr("onclick");
  } else {
    $("#next_button")
      .attr("type", "button")
      .text("Next")
      .attr("onclick", "next()");
  }
  /*if (n === 0) {
    // Check if "Stay Details" tab and validate input
    const adultNo = parseInt($("#adultno").val());
    const childNo = parseInt($("#childno").val());
    const capacity = parseInt($("#roomtype").attr("max"));

    if (isNaN(adultNo) || isNaN(childNo) || adultNo + childNo > capacity) {
      // Display error message and prevent proceeding
      alert("The number of adults or/and children exceeds the maximum capacity of the room " + "("+capacity+")");
      return;
    }
  }*/
}

async function next() {
  // Check if all required fields are filled
  var currentTab = tabs[current];
  var requiredFields = $(currentTab).find("input[required]:visible, select[required]:visible");

  var hasEmptyFields = false;
  requiredFields.each(function () {
    if ($(this).val() === "") {
      hasEmptyFields = true;
      $(this).addClass("is-invalid");
    } else {
      $(this).removeClass("is-invalid");
    }
  });

  if (hasEmptyFields) {
    alert("Please fill in all required fields.");
  } else {
    // Check room availability
    if (current === 0) {
      const adultNo = parseInt($("#adultno").val());
      const childNo = parseInt($("#childno").val());
      const capacity = parseInt($("#adultno").attr("max"));

      if (isNaN(adultNo) || isNaN(childNo) || adultNo + childNo > capacity) {
        alert("The number of adults or/and children exceeds the maximum capacity of the room. Maximum capacity is " + capacity);
        return;
      }

      /*if (!isRoomAvailable) {
        alert("The room is already reserved for the selected dates. Please choose a different room or change the dates.");
        return;
      }*/
    }

    $(tabs[current]).addClass("d-none");
    $(tabs_pill[current]).removeClass("active");
    current++;
    loadFormData(current);
  }
}

function back() {
  $(tabs[current]).addClass("d-none");
  $(tabs_pill[current]).removeClass("active");
  current--;
  loadFormData(current);
}

