import {
  TAP_TO_VIEW_TYPES,
  isTapToViewType,
  isTapToViewOpened,
  getTapToViewState,
  canOpenTapToView,
  tapToViewLabel,
} from './tapToView';

const TS = '2026-06-25T10:00:00.000Z';

describe('TAP_TO_VIEW_TYPES', () => {
  it('image je tap-to-view tip (single source)', () => {
    expect(TAP_TO_VIEW_TYPES).toContain('image');
  });
});

describe('isTapToViewType', () => {
  it('true samo za media tipove (image)', () => {
    expect(isTapToViewType('image')).toBe(true);
  });

  it('false za tekst/audio/file/blah', () => {
    expect(isTapToViewType('text')).toBe(false);
    expect(isTapToViewType('audio')).toBe(false);
    expect(isTapToViewType('file')).toBe(false);
  });

  it('false za null/undefined/prazno', () => {
    expect(isTapToViewType(null)).toBe(false);
    expect(isTapToViewType(undefined)).toBe(false);
    expect(isTapToViewType('')).toBe(false);
  });
});

describe('isTapToViewOpened', () => {
  it('true kad opened_at ima vrednost', () => {
    expect(isTapToViewOpened(TS)).toBe(true);
  });

  it('false kad je null/undefined/prazno', () => {
    expect(isTapToViewOpened(null)).toBe(false);
    expect(isTapToViewOpened(undefined)).toBe(false);
    expect(isTapToViewOpened('')).toBe(false);
    expect(isTapToViewOpened('   ')).toBe(false);
  });
});

describe('getTapToViewState', () => {
  it('tap-to-view dok opened_at nije postavljen', () => {
    expect(getTapToViewState(null)).toBe('tap-to-view');
    expect(getTapToViewState(undefined)).toBe('tap-to-view');
  });

  it('opened kad opened_at ima vrednost', () => {
    expect(getTapToViewState(TS)).toBe('opened');
  });
});

describe('canOpenTapToView', () => {
  it('primalac može da otvori dok nije otvoreno', () => {
    expect(canOpenTapToView({ isSender: false, openedAt: null })).toBe(true);
  });

  it('primalac NE može ponovo kad je već otvoreno', () => {
    expect(canOpenTapToView({ isSender: false, openedAt: TS })).toBe(false);
  });

  it('pošiljalac nikad ne može da otvori (ni pre ni posle)', () => {
    expect(canOpenTapToView({ isSender: true, openedAt: null })).toBe(false);
    expect(canOpenTapToView({ isSender: true, openedAt: TS })).toBe(false);
  });
});

describe('tapToViewLabel', () => {
  it('primalac, neotvoreno → "Tap to View"', () => {
    expect(tapToViewLabel('tap-to-view', false)).toBe('Tap to View');
  });

  it('pošiljalac, neotvoreno → "Delivered"', () => {
    expect(tapToViewLabel('tap-to-view', true)).toBe('Delivered');
  });

  it('otvoreno → "Opened" za obe strane', () => {
    expect(tapToViewLabel('opened', false)).toBe('Opened');
    expect(tapToViewLabel('opened', true)).toBe('Opened');
  });
});
