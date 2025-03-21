import { ToolbarProps } from 'react-big-calendar';
import { format } from 'date-fns';
import "../styles/dashboard.css";

interface CustomToolbarProps extends ToolbarProps {}

const CustomToolbar = (toolbar: CustomToolbarProps) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = toolbar.date;
    return (
      <div className="rbc-toolbar-label">
        {format(date, 'MMMM yyyy')}
      </div>
    );
  };

  return (
    <div className="rbc-toolbar">
      <div className="rbc-btn-group">
        <button
          type="button"
          onClick={goToCurrent}
          aria-label="Go to today"
        >
          Today
        </button>
        <button
          type="button"
          onClick={goToBack}
          aria-label="Go to previous period"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Go to next period"
        >
          Next
        </button>
      </div>
      {label()}
      <div className="rbc-btn-group">
        <button
          type="button"
          className={toolbar.view === 'month' ? 'rbc-active' : ''}
          onClick={() => toolbar.onView('month')}
          aria-label="Switch to month view"
        >
          Month
        </button>
        <button
          type="button"
          className={toolbar.view === 'week' ? 'rbc-active' : ''}
          onClick={() => toolbar.onView('week')}
          aria-label="Switch to week view"
        >
          Week
        </button>
        <button
          type="button"
          className={toolbar.view === 'day' ? 'rbc-active' : ''}
          onClick={() => toolbar.onView('day')}
          aria-label="Switch to day view"
        >
          Day
        </button>
      </div>
    </div>
  );
};

export default CustomToolbar;