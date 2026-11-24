const fs = require('fs');
let code = fs.readFileSync('client/src/pages/faculty/FacultyPortalPage.tsx', 'utf8');

const target = `            {/* Faculty Portal Switcher */}`;
const addition = `            {/* Institutional Course Lifecycle Orchestrator Button */}
            <button
              onClick={() => navigate('/faculty/course-lifecycle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Open 7-Step Institutional Course Lifecycle Flow"
            >
              <BookOpen className="w-3.5 h-3.5 text-white" />
              <span>Lab Course Flow (7-Step)</span>
            </button>

`;

if (!code.includes('/faculty/course-lifecycle')) {
  code = code.replace(target, addition + target);
  fs.writeFileSync('client/src/pages/faculty/FacultyPortalPage.tsx', code, 'utf8');
  console.log('FacultyPortalPage.tsx updated with Course Lifecycle button!');
} else {
  console.log('Button already present.');
}
