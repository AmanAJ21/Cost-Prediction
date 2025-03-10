$(document).ready(function () {
    const components = {
      ".header": "../component/header.html",
      ".footer": "../component/footer.html",
    };
  
    for (const selector in components) {
      $(selector).load(components[selector], function (response, status, xhr) {
        if (status === "error") {
          console.error(`Failed to load ${selector}: ${xhr.status} ${xhr.statusText}`);
          $(selector).html("<p>Error loading component.</p>");
        } else {
          // Wrap the loaded content in an anonymous function to create a new scope.
          try {
            (function() {
            })();
          } catch (e) {
            console.error(`Error executing script in ${selector}:`, e);
          }
        }
      });
    }
  });
  